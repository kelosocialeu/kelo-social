"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PostCard from "@/components/feed/PostCard";
import { useCertifications } from "@/hooks/useCertifications";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getActorProfile, getActorFeed } from "@/lib/atproto/profile";
import { deleteOwnPost } from "@/lib/atproto/posts";

const TABS = ["Posts", "Réponses", "Média", "Vidéos", "Posts aimés", "Fils d'actu"] as const;

function formatFeed(feed: any[]) {
  return feed.map((item: any) => ({
    uri: item.post.uri,
    cid: item.post.cid,
    author: item.post.author,
    record: item.post.record,
    embed: item.post.embed,
    likeCount: item.post.likeCount || 0,
    repostCount: item.post.repostCount || 0,
    replyCount: item.post.replyCount || 0,
    viewer: item.post.viewer || {},
    repostedBy: item.reason?.$type === "app.bsky.feed.defs#reasonRepost" ? item.reason.by : null,
  }));
}

export default function ProfilePage() {
  const params = useParams();
  const targetHandle = decodeURIComponent((params?.handle as string) || "");

  const { checked, handle: myHandle } = useRequireAuth();
  const [myDid, setMyDid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Posts");
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { getStatus } = useCertifications();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const isOwnProfile = checked && myHandle?.toLowerCase() === targetHandle.toLowerCase();

  useEffect(() => {
    if (!checked || !targetHandle) return;

    async function load() {
      try {
        const [profileData, feedData] = await Promise.all([
          getActorProfile(targetHandle),
          getActorFeed(targetHandle, 30),
        ]);
        setProfile(profileData);
        setPosts(formatFeed(feedData));
      } catch (err) {
        console.error("Erreur lors de la récupération du profil :", err);
        setLoadError("Ce profil est introuvable.");
      } finally {
        setLoadingProfile(false);
      }
    }

    load();
  }, [checked, targetHandle]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleLike = (uri: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.uri !== uri) return p;
        const liked = p.viewer?.like;
        return { ...p, viewer: { ...p.viewer, like: !liked }, likeCount: liked ? p.likeCount - 1 : p.likeCount + 1 };
      })
    );
  };

  const handleRepost = (uri: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.uri !== uri) return p;
        const reposted = p.viewer?.repost;
        return {
          ...p,
          viewer: { ...p.viewer, repost: !reposted },
          repostCount: reposted ? p.repostCount - 1 : p.repostCount + 1,
        };
      })
    );
  };

  const handleDelete = async (uri: string) => {
    if (!confirm("Supprimer définitivement cette publication ?")) return;
    try {
      await deleteOwnPost(uri);
      setPosts((prev) => prev.filter((p) => p.uri !== uri));
    } catch (err) {
      console.error(err);
      alert("Impossible de supprimer cette publication.");
    }
  };

  const handleModeration = () => {
    setPosts([]);
  };

  const badgeStatus = getStatus(targetHandle);

  if (!checked || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Chargement du profil...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
        <div className="flex w-full max-w-7xl">
          <Sidebar handle={myHandle} onLogout={handleLogout} />
          <main className="flex min-h-screen max-w-2xl flex-grow items-center justify-center border-r border-kelo-border bg-white shadow-kelo">
            <p className="text-sm text-kelo-muted">{loadError}</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
      <div className="flex w-full max-w-7xl">
        <Sidebar handle={myHandle} onLogout={handleLogout} />

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="relative h-48 overflow-hidden bg-kelo-gradient">
            {profile?.banner ? (
              <img src={profile.banner} alt="Bannière" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-6xl font-extrabold text-white/90">
                  {(profile?.displayName || targetHandle || "Kelo").split(" ")[0]}
                </span>
              </div>
            )}
          </div>

          <div className="px-6">
            <div className="-mt-12 flex items-end justify-between">
              <div className="rounded-full border-4 border-white bg-white shadow-md">
                <Avatar
                  src={profile?.avatar}
                  fallback={(targetHandle[0] || "K").toUpperCase()}
                  size="lg"
                  gradient
                />
              </div>
              {isOwnProfile && (
                <Button variant="secondary" className="mb-2 w-auto px-6">
                  Modifier le profil
                </Button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-kelo-text">{profile?.displayName || targetHandle}</h1>
              {badgeStatus && <Badge status={badgeStatus} />}
            </div>

            <p className="font-semibold text-kelo-primary">@{targetHandle}</p>

            {profile?.description && (
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-kelo-text">{profile.description}</p>
            )}

            <div className="mt-4 flex gap-6 text-sm">
              <span>
                <strong className="text-kelo-text">{profile?.followersCount ?? 0}</strong>{" "}
                <span className="text-kelo-muted">abonné·e·s</span>
              </span>
              <span>
                <strong className="text-kelo-text">{profile?.followsCount ?? 0}</strong>{" "}
                <span className="text-kelo-muted">abonnements</span>
              </span>
              <span>
                <strong className="text-kelo-text">{profile?.postsCount ?? 0}</strong>{" "}
                <span className="text-kelo-muted">posts</span>
              </span>
            </div>

            <div className="mt-6 flex gap-6 overflow-x-auto border-b border-kelo-border text-sm font-bold text-kelo-muted">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap border-b-2 pb-3 transition-colors ${
                    activeTab === tab ? "border-kelo-primary text-kelo-text" : "border-transparent hover:text-kelo-text"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-kelo-border">
            {activeTab !== "Posts" ? (
              <p className="py-10 text-center text-sm text-kelo-muted">Bientôt disponible.</p>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post.uri}
                  post={post}
                  badgeStatus={getStatus(post.author?.handle)}
                  isMine={isOwnProfile}
                  isBookmarked={isBookmarked(post.uri)}
                  replyOpen={activeReplyUri === post.uri}
                  replyText={replyText}
                  onToggleReply={() => setActiveReplyUri(activeReplyUri === post.uri ? null : post.uri)}
                  onReplyTextChange={setReplyText}
                  onSendReply={() => {
                    alert("Commentaire publié !");
                    setReplyText("");
                    setActiveReplyUri(null);
                  }}
                  onLike={() => handleLike(post.uri)}
                  onRepost={() => handleRepost(post.uri)}
                  onBookmark={() => toggleBookmark(post)}
                  onDelete={() => handleDelete(post.uri)}
                  onBlocked={handleModeration}
                  onMuted={handleModeration}
                />
              ))
            ) : (
              <p className="py-10 text-center text-sm text-kelo-muted">Aucune publication pour l'instant.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
