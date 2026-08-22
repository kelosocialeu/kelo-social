"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Home, MessageCircle, Play, Repeat2, RotateCcw, Share2, Volume2 } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import ReelsCommentsSheet from "@/components/reels/ReelsCommentsSheet";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { getDiscoverFeed } from "@/lib/atproto/feed";
import { likePost, unlikePost, repostPost, undoRepost } from "@/lib/atproto/posts";

declare global {
  interface Window {
    Hls?: any;
    __keloHlsPromise?: Promise<any>;
  }
}

const HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";
let reelAudioUnlocked = false;

type FloatingHeart = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  scale: number;
  rotate: number;
};

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

function canUseMseH264(): boolean {
  if (typeof window === "undefined") return false;
  const scope = window as any;
  const MediaSourceCtor = scope.ManagedMediaSource || scope.MediaSource || scope.WebKitMediaSource;
  if (!MediaSourceCtor?.isTypeSupported) return false;
  return MediaSourceCtor.isTypeSupported('video/mp4; codecs="avc1.42E01E"') &&
    MediaSourceCtor.isTypeSupported('audio/mp4; codecs="mp4a.40.2"');
}

function isUsablePlaylist(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function extractVideoEmbed(embed: any): any | null {
  if (!embed || typeof embed !== "object") return null;

  if (embed.$type === "app.bsky.embed.video#view" && isUsablePlaylist(embed.playlist)) {
    return embed;
  }

  if (
    embed.$type === "app.bsky.embed.recordWithMedia#view" &&
    embed.media?.$type === "app.bsky.embed.video#view" &&
    isUsablePlaylist(embed.media?.playlist)
  ) {
    return embed.media;
  }

  return null;
}

function formatVideoPosts(feed: any[]) {
  return feed.flatMap((item: any) => {
    const post = item?.post;
    if (!post?.uri || !post?.cid) return [];

    const videoEmbed = extractVideoEmbed(post.embed);
    if (!videoEmbed) return [];

    return [{
      uri: post.uri,
      cid: post.cid,
      author: post.author,
      record: post.record,
      embed: videoEmbed,
      likeCount: post.likeCount || 0,
      repostCount: post.repostCount || 0,
      replyCount: post.replyCount || 0,
      viewer: post.viewer || {},
    }];
  });
}

function ReelVideo({ post, onStateChange }: { post: any; onStateChange: (patch: Record<string, unknown>) => void }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<number | null>(null);
  const heartIdRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [busyAction, setBusyAction] = useState<"like" | "repost" | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let recoveryCount = 0;

    setReady(false);
    setPlaying(false);
    setVideoError(null);
    setNeedsAudioUnlock(false);
    video.muted = !reelAudioUnlocked;

    const attachVideo = async () => {
      try {
        const Hls = await ensureHlsJs();
        if (cancelled) return;

        if (Hls?.isSupported?.() && canUseMseH264()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxMaxBufferLength: 12,
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
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryCount < 3) {
              recoveryCount += 1;
              try { hls.startLoad(); } catch {}
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryCount < 3) {
              recoveryCount += 1;
              try { hls.recoverMediaError(); } catch {}
              return;
            }
            console.error("Erreur HLS fatale Réels", data);
            setVideoError("Impossible de lire cette vidéo sur cet appareil.");
          });
          return;
        }
      } catch (error) {
        console.warn("hls.js indisponible pour Réels", error);
      }

      if (video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL")) {
        const onNativeError = () => setVideoError("Impossible de lire cette vidéo sur cet appareil.");
        video.addEventListener("error", onNativeError, { once: true });
        video.src = post.embed.playlist;
        video.load();
        return;
      }

      setVideoError("Ce navigateur ne prend pas en charge le format vidéo utilisé.");
    };

    const onCanPlay = () => setReady(true);
    video.addEventListener("canplay", onCanPlay);
    void attachVideo();

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", onCanPlay);
      try { hlsRef.current?.destroy?.(); } catch {}
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [post.embed.playlist, retryKey]);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video || !ready) return;

    const playVisibleVideo = async () => {
      if (commentsOpen) return;

      if (reelAudioUnlocked) {
        video.muted = false;
        try {
          await video.play();
          setNeedsAudioUnlock(false);
          return;
        } catch {
          // Si le navigateur refuse malgré une interaction précédente, on passe
          // au mode autoplay silencieux afin que la vidéo démarre quand même.
        }
      }

      video.muted = false;
      try {
        await video.play();
        reelAudioUnlocked = true;
        setNeedsAudioUnlock(false);
      } catch {
        video.muted = true;
        try {
          await video.play();
          setNeedsAudioUnlock(true);
        } catch (error) {
          console.warn("Autoplay du Réel impossible", error);
          setPlaying(false);
        }
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65 && !commentsOpen) {
        void playVisibleVideo();
      } else {
        video.pause();
      }
    }, { threshold: [0.25, 0.65, 0.9] });

    observer.observe(root);
    return () => observer.disconnect();
  }, [ready, commentsOpen]);

  useEffect(() => () => {
    if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || videoError) return;

    try {
      if (video.muted || needsAudioUnlock) {
        video.muted = false;
        reelAudioUnlocked = true;
        setNeedsAudioUnlock(false);
        await video.play();
        return;
      }

      if (video.paused) await video.play();
      else video.pause();
    } catch (error) {
      console.error("Lecture du réel impossible", error);
      setActionError("La lecture n’a pas pu démarrer. Réessayez.");
    }
  };

  const toggleLike = async () => {
    if (busyAction) return;
    setBusyAction("like");
    setActionError(null);
    try {
      if (post.viewer?.like) {
        await unlikePost(post.viewer.like);
        onStateChange({ viewer: { ...post.viewer, like: undefined }, likeCount: Math.max(0, post.likeCount - 1) });
      } else {
        const likeUri = await likePost({ uri: post.uri, cid: post.cid });
        onStateChange({ viewer: { ...post.viewer, like: likeUri }, likeCount: post.likeCount + 1 });
      }
    } catch (error) {
      console.error("Impossible de modifier le like du réel", error);
      setActionError("Impossible de mettre J’aime pour le moment.");
    } finally {
      setBusyAction(null);
    }
  };

  const likeFromDoubleTap = async () => {
    if (post.viewer?.like || busyAction) return;
    setBusyAction("like");
    setActionError(null);
    try {
      const likeUri = await likePost({ uri: post.uri, cid: post.cid });
      onStateChange({ viewer: { ...post.viewer, like: likeUri }, likeCount: post.likeCount + 1 });
    } catch (error) {
      console.error("Impossible de liker le Réel avec le double tap", error);
      setActionError("Impossible de mettre J’aime pour le moment.");
    } finally {
      setBusyAction(null);
    }
  };

  const spawnHearts = (clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const baseX = clientX - rect.left;
    const baseY = clientY - rect.top;
    const created = Array.from({ length: 6 }, (_, index): FloatingHeart => ({
      id: ++heartIdRef.current,
      x: baseX + (index - 2.5) * 7,
      y: baseY + (index % 2) * 6,
      dx: (Math.random() - 0.5) * 90,
      dy: -90 - Math.random() * 90,
      scale: 0.8 + Math.random() * 0.8,
      rotate: -25 + Math.random() * 50,
    }));
    setHearts((current) => [...current, ...created]);
    window.setTimeout(() => {
      const ids = new Set(created.map((heart) => heart.id));
      setHearts((current) => current.filter((heart) => !ids.has(heart.id)));
    }, 950);
  };

  const handleVideoTap = (event: React.MouseEvent<HTMLVideoElement>) => {
    if (commentsOpen) return;
    const now = Date.now();
    const elapsed = now - lastTapRef.current;

    if (elapsed > 0 && elapsed < 330) {
      lastTapRef.current = 0;
      if (singleTapTimerRef.current) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      spawnHearts(event.clientX, event.clientY);
      void likeFromDoubleTap();
      return;
    }

    lastTapRef.current = now;
    singleTapTimerRef.current = window.setTimeout(() => {
      void togglePlay();
      singleTapTimerRef.current = null;
    }, 300);
  };

  const toggleRepost = async () => {
    if (busyAction) return;
    setBusyAction("repost");
    setActionError(null);
    try {
      if (post.viewer?.repost) {
        await undoRepost(post.viewer.repost);
        onStateChange({ viewer: { ...post.viewer, repost: undefined }, repostCount: Math.max(0, post.repostCount - 1) });
      } else {
        const repostUri = await repostPost({ uri: post.uri, cid: post.cid });
        onStateChange({ viewer: { ...post.viewer, repost: repostUri }, repostCount: post.repostCount + 1 });
      }
    } catch (error) {
      console.error("Impossible de modifier le repost du réel", error);
      setActionError("Impossible de republier pour le moment.");
    } finally {
      setBusyAction(null);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post?uri=${encodeURIComponent(post.uri)}`;
    const shareData = {
      title: post.author?.displayName ? `${post.author.displayName} sur Kelo Social` : "Kelo Social",
      text: typeof post.record?.text === "string" ? post.record.text : "Découvrez ce Réel sur Kelo Social",
      url,
    };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setActionError("Lien copié. Vous pouvez le partager dans l’application de votre choix.");
        window.setTimeout(() => setActionError(null), 2200);
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") setActionError("Impossible d’ouvrir le menu de partage.");
    }
  };

  const openComments = () => {
    videoRef.current?.pause();
    setCommentsOpen(true);
  };

  const text = typeof post.record?.text === "string" ? post.record.text : "";

  return (
    <section ref={rootRef} className="relative h-[100dvh] w-full snap-start overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        poster={typeof post.embed.thumbnail === "string" ? post.embed.thumbnail : undefined}
        playsInline
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={handleVideoTap}
        className="absolute inset-0 h-full w-full select-none bg-black object-contain"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/80" />

      {hearts.map((heart) => (
        <div key={heart.id} className="pointer-events-none absolute z-40 text-fuchsia-500" style={{ left: heart.x, top: heart.y, transform: `translate(-50%, -50%) scale(${heart.scale}) rotate(${heart.rotate}deg)`, animation: "kelo-reel-heart 900ms cubic-bezier(.2,.8,.2,1) forwards", ["--heart-dx" as any]: `${heart.dx}px`, ["--heart-dy" as any]: `${heart.dy}px` }}>
          <Heart className="h-14 w-14 drop-shadow-[0_5px_16px_rgba(0,0,0,.45)]" fill="currentColor" strokeWidth={0} />
        </div>
      ))}

      {videoError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-black/70 px-5 py-4 text-sm font-semibold text-white backdrop-blur-md">
            <span>{videoError}</span>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold"><RotateCcw className="h-4 w-4" />Réessayer</button>
          </div>
        </div>
      ) : !playing && ready && !commentsOpen ? (
        <button type="button" onClick={togglePlay} aria-label="Lire la vidéo" className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"><Play className="ml-1 h-8 w-8" fill="currentColor" /></button>
      ) : null}

      {needsAudioUnlock && playing && !commentsOpen && (
        <button type="button" onClick={togglePlay} className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
          <Volume2 className="h-4 w-4" /> Toucher pour activer le son
        </button>
      )}

      {actionError && <div className="absolute left-1/2 top-32 z-40 max-w-[80vw] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur-md">{actionError}</div>}

      <div className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex items-end gap-4 px-4 pb-3 sm:px-6 md:bottom-8">
        <div className="min-w-0 flex-1 pb-1">
          <button type="button" onClick={() => router.push(`/profile/${post.author?.handle}`)} className="mb-3 flex w-fit items-center gap-3 text-left">
            <Avatar src={post.author?.avatar} fallback={(post.author?.handle || "K")[0].toUpperCase()} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="max-w-[58vw] truncate text-sm font-extrabold drop-shadow md:max-w-md">{post.author?.displayName || post.author?.handle}</span>
                <AccountBadges actor={post.author} identitySize="sm" certificationSize={16} gap="xs" />
              </div>
              <span className="block max-w-[58vw] truncate text-xs text-white/75 md:max-w-md">@{post.author?.handle}</span>
            </div>
          </button>
          {text && <p className="line-clamp-3 max-w-xl whitespace-pre-wrap text-sm leading-5 text-white drop-shadow-md sm:text-[15px]">{text}</p>}
        </div>

        <div className="flex flex-col items-center gap-4 pb-1">
          <ActionButton label="J’aime" count={post.likeCount} active={!!post.viewer?.like} disabled={!!busyAction} onClick={toggleLike}><Heart className="h-7 w-7" fill={post.viewer?.like ? "currentColor" : "none"} /></ActionButton>
          <button type="button" onClick={openComments} className="flex flex-col items-center gap-1" aria-label="Commentaires"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md"><MessageCircle className="h-7 w-7" /></span><span className="text-[11px] font-bold">{post.replyCount || 0}</span></button>
          <ActionButton label="Republier" count={post.repostCount} active={!!post.viewer?.repost} disabled={!!busyAction} onClick={toggleRepost}><Repeat2 className="h-7 w-7" /></ActionButton>
          <button type="button" onClick={share} aria-label="Partager avec vos applications" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:scale-95"><Share2 className="h-7 w-7" /></button>
        </div>
      </div>

      <ReelsCommentsSheet open={commentsOpen} post={post} onClose={() => setCommentsOpen(false)} onReplyAdded={() => onStateChange({ replyCount: (post.replyCount || 0) + 1 })} />

      <style jsx>{`
        @keyframes kelo-reel-heart {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.3) rotate(0deg); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--heart-dx)), calc(-50% + var(--heart-dy))) scale(1.25) rotate(12deg); }
        }
      `}</style>
    </section>
  );
}

function ActionButton({ children, count, active, label, onClick, disabled }: { children: React.ReactNode; count: number; active?: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className={`flex flex-col items-center gap-1 active:scale-95 disabled:opacity-60 ${active ? "text-fuchsia-400" : "text-white"}`}><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">{children}</span><span className="text-[11px] font-bold text-white">{count || 0}</span></button>;
}

export default function ReelsPage() {
  const { checked, handle } = useRequireAuth();

  const fetchReelsPage = useCallback(async (cursor?: string) => {
    let nextCursor = cursor;
    const collected: any[] = [];

    for (let attempt = 0; attempt < 8 && collected.length < 12; attempt += 1) {
      const response = await getDiscoverFeed(50, nextCursor);
      collected.push(...formatVideoPosts(response.items));
      nextCursor = response.cursor;
      if (!nextCursor) break;
    }

    return { items: collected, cursor: nextCursor };
  }, []);

  const { items, setItems, loading, loadingMore, hasMore, error, loadMore } = useInfiniteFeed(fetchReelsPage, [checked], {
    cacheKey: "reels",
    staleTimeMs: 5_000,
    refreshOnFocus: true,
  });

  const patchPost = (uri: string, patch: Record<string, unknown>) => setItems((current) => current.map((post: any) => post.uri === uri ? { ...post, ...patch } : post));
  const handleLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  if (!checked) return <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/70">Chargement des Réels…</div>;

  return (
    <div className="min-h-[100dvh] bg-black">
      <Sidebar handle={handle} onLogout={handleLogout} />
      <main className="relative md:ml-0">
        <div className="fixed left-4 top-[max(18px,env(safe-area-inset-top))] z-40 md:left-[calc(18rem+1rem)]"><Link href="/feed" aria-label="Retour au fil d’actualité" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md md:hidden"><Home className="h-5 w-5" /></Link></div>
        <div className="pointer-events-none fixed left-1/2 top-[max(18px,env(safe-area-inset-top))] z-30 -translate-x-1/2 rounded-full bg-black/35 px-4 py-2 text-sm font-extrabold text-white backdrop-blur-md">Réels</div>

        {loading && items.length === 0 ? (
          <div className="flex h-[100dvh] items-center justify-center text-white/70">Recherche de vidéos…</div>
        ) : error && items.length === 0 ? (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center text-white"><p className="font-bold">Impossible de charger les Réels.</p><p className="text-sm text-white/60">{error}</p></div>
        ) : items.length === 0 ? (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center text-white"><p className="text-lg font-extrabold">Aucune vidéo disponible pour le moment.</p><p className="max-w-md text-sm text-white/60">Cette page affiche uniquement les vraies publications vidéo AT Protocol.</p><Link href="/feed" className="mt-2 rounded-full bg-kelo-gradient px-5 py-2.5 text-sm font-bold text-white">Retour à l’accueil</Link></div>
        ) : (
          <div className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black">
            {items.map((post: any) => <ReelVideo key={post.uri} post={post} onStateChange={(patch) => patchPost(post.uri, patch)} />)}
            <div className="snap-start bg-black py-3"><InfiniteScrollSentinel onIntersect={loadMore} disabled={loadingMore || !hasMore} preloadDistance={2400} /></div>
          </div>
        )}
      </main>
    </div>
  );
}
