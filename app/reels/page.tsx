"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Home, MessageCircle, Play, Repeat2, RotateCcw, Share2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import ReelTapGestureLayer from "@/components/reels/ReelTapGestureLayer";
import ReelsCommentsSheet from "@/components/reels/ReelsCommentsSheet";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { getDiscoverFeed, getFollowingFeed } from "@/lib/atproto/feed";
import { likePost, unlikePost, repostPost, undoRepost } from "@/lib/atproto/posts";

declare global {
  interface Window {
    Hls?: any;
    __keloHlsPromise?: Promise<any>;
  }
}

const HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";
let reelAudioUnlocked = false;
type ReelMode = "foryou" | "following";

function ensureHlsJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Hls) return Promise.resolve(window.Hls);
  if (window.__keloHlsPromise) return window.__keloHlsPromise;

  window.__keloHlsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${HLS_JS_URL}"]`);
    if (existing) {
      if (window.Hls) return resolve(window.Hls);
      existing.addEventListener("load", () => resolve(window.Hls), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = HLS_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.Hls);
    script.onerror = () => reject(new Error("Impossible de charger hls.js"));
    document.head.appendChild(script);
  });

  return window.__keloHlsPromise;
}

function canUseMseH264() {
  if (typeof window === "undefined") return false;
  const source = window as any;
  const MediaSourceClass = source.ManagedMediaSource || source.MediaSource || source.WebKitMediaSource;
  return (
    !!MediaSourceClass?.isTypeSupported &&
    MediaSourceClass.isTypeSupported('video/mp4; codecs="avc1.42E01E"') &&
    MediaSourceClass.isTypeSupported('audio/mp4; codecs="mp4a.40.2"')
  );
}

function validPlaylist(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function extractVideo(embed: any) {
  if (embed?.$type === "app.bsky.embed.video#view" && validPlaylist(embed.playlist)) return embed;
  if (
    embed?.$type === "app.bsky.embed.recordWithMedia#view" &&
    embed.media?.$type === "app.bsky.embed.video#view" &&
    validPlaylist(embed.media.playlist)
  ) {
    return embed.media;
  }
  return null;
}

function formatVideos(feed: any[]) {
  return feed.flatMap((item: any) => {
    const post = item?.post;
    const embed = extractVideo(post?.embed);
    return post?.uri && post?.cid && embed
      ? [
          {
            uri: post.uri,
            cid: post.cid,
            author: post.author,
            record: post.record,
            embed,
            likeCount: post.likeCount || 0,
            repostCount: post.repostCount || 0,
            replyCount: post.replyCount || 0,
            viewer: post.viewer || {},
          },
        ]
      : [];
  });
}

function isMostlyVisible(root: HTMLElement) {
  const rect = root.getBoundingClientRect();
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(window.innerHeight, rect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  return rect.height > 0 && visibleHeight / rect.height >= 0.6;
}

function ReelVideo({
  post,
  onStateChange,
}: {
  post: any;
  onStateChange: (patch: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const playGenerationRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"like" | "repost" | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let recovery = 0;
    setReady(false);
    setPlaying(false);
    setVideoError(null);

    video.defaultMuted = false;
    video.volume = 1;
    video.muted = !reelAudioUnlocked;

    const attach = async () => {
      try {
        const Hls = await ensureHlsJs();
        if (cancelled) return;

        if (Hls?.isSupported?.() && canUseMseH264()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 12,
            backBufferLength: 20,
            startLevel: -1,
          });
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(post.embed.playlist));
          hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
          hls.on(Hls.Events.ERROR, (_event: unknown, data: any) => {
            if (!data?.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recovery++ < 3) {
              try {
                hls.startLoad();
              } catch {}
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recovery++ < 3) {
              try {
                hls.recoverMediaError();
              } catch {}
              return;
            }
            setVideoError("Impossible de lire cette vidéo sur cet appareil.");
          });
          return;
        }
      } catch {}

      if (
        video.canPlayType("application/vnd.apple.mpegurl") ||
        video.canPlayType("application/x-mpegURL")
      ) {
        video.src = post.embed.playlist;
        video.load();
        return;
      }

      setVideoError("Ce navigateur ne prend pas en charge cette vidéo.");
    };

    const onCanPlay = () => setReady(true);
    video.addEventListener("canplay", onCanPlay);
    void attach();

    return () => {
      cancelled = true;
      playGenerationRef.current += 1;
      video.removeEventListener("canplay", onCanPlay);
      try {
        hlsRef.current?.destroy?.();
      } catch {}
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [post.embed.playlist, retry]);

  const playVisibleVideo = useCallback(async () => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video || commentsOpen || !isMostlyVisible(root)) return;

    const generation = ++playGenerationRef.current;
    video.defaultMuted = false;
    video.volume = 1;

    if (reelAudioUnlocked) {
      video.muted = false;
      const delays = [0, 80, 220];
      for (const delay of delays) {
        if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
        if (generation !== playGenerationRef.current || commentsOpen || !isMostlyVisible(root)) return;
        try {
          await video.play();
          return;
        } catch {}
      }
      setPlaying(false);
      return;
    }

    // Premier affichage uniquement : certains navigateurs interdisent l'autoplay sonore
    // avant la toute première interaction. On garde alors la vidéo fluide en silencieux,
    // mais le premier swipe/touch déverrouille automatiquement le son pour la suite.
    video.muted = false;
    try {
      await video.play();
      reelAudioUnlocked = true;
      return;
    } catch {}

    video.muted = true;
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  }, [commentsOpen]);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video || !ready) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65 && !commentsOpen) {
          void playVisibleVideo();
        } else {
          playGenerationRef.current += 1;
          video.pause();
        }
      },
      { threshold: [0.25, 0.65, 0.9] }
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [ready, commentsOpen, playVisibleVideo]);

  useEffect(() => {
    const unlockAudio = () => {
      reelAudioUnlocked = true;
      const root = rootRef.current;
      const video = videoRef.current;
      if (!root || !video) return;

      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;

      if (!commentsOpen && ready && isMostlyVisible(root)) {
        void video.play().catch(() => {
          window.setTimeout(() => {
            if (!commentsOpen && isMostlyVisible(root)) {
              video.muted = false;
              void video.play().catch(() => {});
            }
          }, 80);
        });
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("touchstart", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [commentsOpen, ready]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || videoError) return;

    try {
      reelAudioUnlocked = true;
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setActionError("La lecture n’a pas pu démarrer.");
    }
  };

  const toggleLike = async () => {
    if (busy || post.viewer?.like === "__kelo_pending_like__") return;
    setBusy("like");
    try {
      if (post.viewer?.like) {
        await unlikePost(post.viewer.like);
        onStateChange({
          viewer: { ...post.viewer, like: undefined },
          likeCount: Math.max(0, post.likeCount - 1),
        });
      } else {
        const uri = await likePost({ uri: post.uri, cid: post.cid });
        onStateChange({
          viewer: { ...post.viewer, like: uri },
          likeCount: post.likeCount + 1,
        });
      }
    } catch {
      setActionError("Impossible de mettre J’aime.");
    } finally {
      setBusy(null);
    }
  };

  const toggleRepost = async () => {
    if (busy) return;
    setBusy("repost");
    try {
      if (post.viewer?.repost) {
        await undoRepost(post.viewer.repost);
        onStateChange({
          viewer: { ...post.viewer, repost: undefined },
          repostCount: Math.max(0, post.repostCount - 1),
        });
      } else {
        const uri = await repostPost({ uri: post.uri, cid: post.cid });
        onStateChange({
          viewer: { ...post.viewer, repost: uri },
          repostCount: post.repostCount + 1,
        });
      }
    } catch {
      setActionError("Impossible de republier.");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post?uri=${encodeURIComponent(post.uri)}`;
    const data = {
      title: post.author?.displayName
        ? `${post.author.displayName} sur Kelo Social`
        : "Kelo Social",
      text: post.record?.text || "Découvrez ce Réel sur Kelo Social",
      url,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") setActionError("Impossible d’ouvrir le partage.");
    }
  };

  return (
    <section
      ref={rootRef}
      className="relative h-[100dvh] w-full snap-start overflow-hidden bg-black text-white"
    >
      <video
        ref={videoRef}
        poster={typeof post.embed.thumbnail === "string" ? post.embed.thumbnail : undefined}
        playsInline
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full select-none bg-black object-contain"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/80" />

      <ReelTapGestureLayer
        post={post}
        disabled={commentsOpen || !!videoError}
        onSingleTap={togglePlay}
        onStateChange={onStateChange}
        onError={setActionError}
      />

      {videoError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center">
          <div className="rounded-2xl bg-black/70 px-5 py-4 text-sm font-semibold">
            <p>{videoError}</p>
            <button
              onClick={() => setRetry((value) => value + 1)}
              className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold"
            >
              <RotateCcw className="h-4 w-4" />
              Réessayer
            </button>
          </div>
        </div>
      ) : !playing && ready && !commentsOpen ? (
        <button
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45"
        >
          <Play className="ml-1 h-8 w-8" fill="currentColor" />
        </button>
      ) : null}

      {actionError && (
        <div className="absolute left-1/2 top-36 z-40 max-w-[80vw] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-semibold">
          {actionError}
        </div>
      )}

      <div className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex items-end gap-4 px-4 pb-3 sm:px-6 md:bottom-8">
        <div className="min-w-0 flex-1 pb-1">
          <button
            onClick={() => router.push(`/profile/${post.author?.handle}`)}
            className="mb-3 flex w-fit items-center gap-3 text-left"
          >
            <Avatar
              src={post.author?.avatar}
              fallback={(post.author?.handle || "K")[0].toUpperCase()}
              size="sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="max-w-[58vw] truncate text-sm font-extrabold">
                  {post.author?.displayName || post.author?.handle}
                </span>
                <AccountBadges
                  actor={post.author}
                  identitySize="sm"
                  certificationSize={16}
                  gap="xs"
                />
              </div>
              <span className="block max-w-[58vw] truncate text-xs text-white/75">
                @{post.author?.handle}
              </span>
            </div>
          </button>
          {post.record?.text && (
            <p className="line-clamp-3 max-w-xl whitespace-pre-wrap text-sm leading-5">
              {post.record.text}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 pb-1">
          <ActionButton
            count={post.likeCount}
            active={!!post.viewer?.like}
            disabled={!!busy}
            onClick={toggleLike}
          >
            <Heart
              className="h-7 w-7"
              fill={post.viewer?.like ? "currentColor" : "none"}
            />
          </ActionButton>

          <button
            onClick={() => {
              videoRef.current?.pause();
              setCommentsOpen(true);
            }}
            className="flex flex-col items-center gap-1"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40">
              <MessageCircle className="h-7 w-7" />
            </span>
            <span className="text-[11px] font-bold">{post.replyCount || 0}</span>
          </button>

          <ActionButton
            count={post.repostCount}
            active={!!post.viewer?.repost}
            disabled={!!busy}
            onClick={toggleRepost}
          >
            <Repeat2 className="h-7 w-7" />
          </ActionButton>

          <button
            onClick={share}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40"
          >
            <Share2 className="h-7 w-7" />
          </button>
        </div>
      </div>

      <ReelsCommentsSheet
        open={commentsOpen}
        post={post}
        onClose={() => setCommentsOpen(false)}
        onReplyAdded={() => onStateChange({ replyCount: (post.replyCount || 0) + 1 })}
      />
    </section>
  );
}

function ActionButton({
  children,
  count,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  count: number;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 active:scale-95 disabled:opacity-60 ${
        active ? "text-fuchsia-400" : "text-white"
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40">
        {children}
      </span>
      <span className="text-[11px] font-bold text-white">{count || 0}</span>
    </button>
  );
}

function ReelFeed({ mode }: { mode: ReelMode }) {
  const fetchPage = useCallback(
    async (cursor?: string) => {
      let next = cursor;
      const collected: any[] = [];

      for (let i = 0; i < 8 && collected.length < 12; i++) {
        const result =
          mode === "following"
            ? await getFollowingFeed(50, next)
            : await getDiscoverFeed(50, next);
        collected.push(...formatVideos(result.items));
        next = result.cursor;
        if (!next) break;
      }

      return { items: collected, cursor: next };
    },
    [mode]
  );

  const { items, setItems, loading, loadingMore, hasMore, error, loadMore } = useInfiniteFeed(
    fetchPage,
    [mode],
    {
      cacheKey: `reels:${mode}`,
      staleTimeMs: 10000,
      refreshOnFocus: true,
    }
  );

  const patch = (uri: string, patchValue: Record<string, unknown>) =>
    setItems((current) =>
      current.map((post: any) => (post.uri === uri ? { ...post, ...patchValue } : post))
    );

  if (loading && !items.length) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-white/70">
        Recherche de vidéos…
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="flex h-[100dvh] items-center justify-center px-6 text-center text-white">
        Impossible de charger ce fil.
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center text-white">
        <p className="text-lg font-extrabold">
          {mode === "following"
            ? "Aucune vidéo de vos abonnements pour le moment."
            : "Aucune vidéo disponible pour le moment."}
        </p>
        <p className="max-w-md text-sm text-white/60">
          {mode === "following"
            ? "Les vidéos des comptes que vous suivez apparaîtront ici."
            : "Cette page affiche uniquement les publications vidéo AT Protocol."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black">
      {items.map((post: any) => (
        <ReelVideo
          key={post.uri}
          post={post}
          onStateChange={(patchValue) => patch(post.uri, patchValue)}
        />
      ))}
      <div className="snap-start bg-black py-3">
        <InfiniteScrollSentinel
          onIntersect={loadMore}
          disabled={loadingMore || !hasMore}
          preloadDistance={2400}
        />
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const { checked, handle } = useRequireAuth();
  const [mode, setMode] = useState<ReelMode>("foryou");

  useEffect(() => {
    const saved = localStorage.getItem("kelo-reels-mode");
    if (saved === "following" || saved === "foryou") setMode(saved);
  }, []);

  const changeMode = (next: ReelMode) => {
    setMode(next);
    localStorage.setItem("kelo-reels-mode", next);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/70">
        Chargement des Réels…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black">
      <Sidebar handle={handle} onLogout={handleLogout} />
      <main className="relative md:ml-0">
        <div className="fixed left-4 top-[max(18px,env(safe-area-inset-top))] z-50 md:left-[calc(18rem+1rem)]">
          <Link
            href="/feed"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white"
          >
            <Home className="h-5 w-5" />
          </Link>
        </div>

        <div className="fixed left-1/2 top-[max(14px,env(safe-area-inset-top))] z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/55 p-1 text-sm font-extrabold text-white backdrop-blur-md">
          <button
            onClick={() => changeMode("following")}
            className={`rounded-full px-4 py-2 ${
              mode === "following" ? "bg-white text-black" : "text-white/70"
            }`}
          >
            Abonnements
          </button>
          <button
            onClick={() => changeMode("foryou")}
            className={`rounded-full px-4 py-2 ${
              mode === "foryou" ? "bg-white text-black" : "text-white/70"
            }`}
          >
            Pour toi
          </button>
        </div>

        <div className={mode === "foryou" ? "block" : "hidden"}>
          <ReelFeed mode="foryou" />
        </div>
        <div className={mode === "following" ? "block" : "hidden"}>
          <ReelFeed mode="following" />
        </div>
      </main>
    </div>
  );
}
