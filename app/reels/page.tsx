"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Home, MessageCircle, Play, Repeat2, Share2, Volume2, VolumeX } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { getDiscoverFeed } from "@/lib/atproto/feed";
import { likePost, unlikePost, repostPost, undoRepost } from "@/lib/atproto/posts";

function formatVideoPosts(feed: any[]) {
  return feed
    .map((item: any) => item?.post)
    .filter((post: any) => post?.embed?.$type === "app.bsky.embed.video#view" && post.embed?.playlist)
    .map((post: any) => ({
      uri: post.uri,
      cid: post.cid,
      author: post.author,
      record: post.record,
      embed: post.embed,
      likeCount: post.likeCount || 0,
      repostCount: post.repostCount || 0,
      replyCount: post.replyCount || 0,
      viewer: post.viewer || {},
    }));
}

function ReelVideo({ post, onStateChange }: { post: any; onStateChange: (patch: Record<string, unknown>) => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, { threshold: [0.25, 0.65, 0.9] });

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  const toggleRepost = async () => {
    if (busy) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post?uri=${encodeURIComponent(post.uri)}`;
    try {
      if (navigator.share) await navigator.share({ title: post.author?.displayName || "Kelo Social", url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const text = typeof post.record?.text === "string" ? post.record.text : "";

  return (
    <section ref={rootRef} className="relative h-[100dvh] w-full snap-start overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        src={post.embed.playlist}
        poster={post.embed.thumbnail}
        playsInline
        loop
        muted={muted}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
        className="absolute inset-0 h-full w-full bg-black object-contain"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/80" />

      {!playing && (
        <button type="button" onClick={togglePlay} aria-label="Lire la vidéo" className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
          <Play className="ml-1 h-8 w-8" fill="currentColor" />
        </button>
      )}

      <button type="button" onClick={toggleMute} aria-label={muted ? "Activer le son" : "Couper le son"} className="absolute right-4 top-[max(18px,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex items-end gap-4 px-4 pb-3 sm:px-6 md:bottom-8">
        <div className="min-w-0 flex-1 pb-1">
          <Link href={`/profile/${post.author?.handle}`} className="mb-3 flex w-fit items-center gap-3">
            <Avatar src={post.author?.avatar} fallback={(post.author?.handle || "K")[0].toUpperCase()} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="max-w-[58vw] truncate text-sm font-extrabold drop-shadow md:max-w-md">{post.author?.displayName || post.author?.handle}</span>
                <AccountBadges actor={post.author} identitySize="sm" certificationSize={16} gap="xs" />
              </div>
              <span className="block max-w-[58vw] truncate text-xs text-white/75 md:max-w-md">@{post.author?.handle}</span>
            </div>
          </Link>
          {text && <p className="line-clamp-3 max-w-xl whitespace-pre-wrap text-sm leading-5 text-white drop-shadow-md sm:text-[15px]">{text}</p>}
        </div>

        <div className="flex flex-col items-center gap-4 pb-1">
          <ActionButton label="J’aime" count={post.likeCount} active={!!post.viewer?.like} onClick={toggleLike}><Heart className="h-7 w-7" fill={post.viewer?.like ? "currentColor" : "none"} /></ActionButton>
          <Link href={`/post?uri=${encodeURIComponent(post.uri)}`} className="flex flex-col items-center gap-1" aria-label="Commentaires"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md"><MessageCircle className="h-7 w-7" /></span><span className="text-[11px] font-bold">{post.replyCount || 0}</span></Link>
          <ActionButton label="Republier" count={post.repostCount} active={!!post.viewer?.repost} onClick={toggleRepost}><Repeat2 className="h-7 w-7" /></ActionButton>
          <button type="button" onClick={share} aria-label="Partager" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md"><Share2 className="h-7 w-7" /></button>
        </div>
      </div>
    </section>
  );
}

function ActionButton({ children, count, active, label, onClick }: { children: React.ReactNode; count: number; active?: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={label} className={`flex flex-col items-center gap-1 ${active ? "text-fuchsia-400" : "text-white"}`}><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">{children}</span><span className="text-[11px] font-bold text-white">{count || 0}</span></button>;
}

export default function ReelsPage() {
  const { checked, handle } = useRequireAuth();

  const fetchReelsPage = useCallback(async (cursor?: string) => {
    let nextCursor = cursor;
    const collected: any[] = [];

    for (let attempt = 0; attempt < 4 && collected.length < 8; attempt += 1) {
      const response = await getDiscoverFeed(50, nextCursor);
      collected.push(...formatVideoPosts(response.items));
      nextCursor = response.cursor;
      if (!nextCursor) break;
    }

    return { items: collected, cursor: nextCursor };
  }, []);

  const { items, setItems, loading, loadingMore, hasMore, error, loadMore } = useInfiniteFeed(fetchReelsPage, [checked]);

  const patchPost = (uri: string, patch: Record<string, unknown>) => {
    setItems((current) => current.map((post: any) => post.uri === uri ? { ...post, ...patch } : post));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) return <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/70">Chargement des Réels…</div>;

  return (
    <div className="min-h-[100dvh] bg-black">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="relative md:ml-0">
        <div className="fixed left-4 top-[max(18px,env(safe-area-inset-top))] z-40 md:left-[calc(18rem+1rem)]">
          <Link href="/feed" aria-label="Retour au fil d’actualité" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md md:hidden"><Home className="h-5 w-5" /></Link>
        </div>

        <div className="pointer-events-none fixed left-1/2 top-[max(18px,env(safe-area-inset-top))] z-30 -translate-x-1/2 rounded-full bg-black/35 px-4 py-2 text-sm font-extrabold text-white backdrop-blur-md">Réels</div>

        {loading && items.length === 0 ? (
          <div className="flex h-[100dvh] items-center justify-center text-white/70">Recherche de vidéos…</div>
        ) : error && items.length === 0 ? (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center text-white"><p className="font-bold">Impossible de charger les Réels.</p><p className="text-sm text-white/60">{error}</p></div>
        ) : items.length === 0 ? (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center text-white"><p className="text-lg font-extrabold">Aucune vidéo disponible pour le moment.</p><p className="max-w-md text-sm text-white/60">Les fils d’actualité classiques restent disponibles dans Accueil. Cette page affiche uniquement les publications contenant une vidéo.</p><Link href="/feed" className="mt-2 rounded-full bg-kelo-gradient px-5 py-2.5 text-sm font-bold text-white">Retour à l’accueil</Link></div>
        ) : (
          <div className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black">
            {items.map((post: any) => <ReelVideo key={post.uri} post={post} onStateChange={(patch) => patchPost(post.uri, patch)} />)}
            <div className="snap-start bg-black py-3"><InfiniteScrollSentinel onIntersect={loadMore} disabled={loadingMore || !hasMore} /></div>
          </div>
        )}
      </main>
    </div>
  );
}
