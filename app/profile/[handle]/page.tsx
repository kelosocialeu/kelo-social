"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Button from "@/components/ui/Button";
import AccountBadges from "@/components/ui/AccountBadges";
import PostCard from "@/components/feed/PostCard";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import FollowButton from "@/components/profile/FollowButton";
import ProfileMoreMenu from "@/components/profile/ProfileMoreMenu";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { getActorProfile, getActorFeed } from "@/lib/atproto/profile";
import { deleteOwnPost } from "@/lib/atproto/posts";
import { getActorLists, ManagedList } from "@/lib/atproto/lists";
import { getActorStarterPacks, StarterPackView } from "@/lib/atproto/starter-packs";

const BASE_TABS = ["Posts", "Réponses", "Média", "Vidéos", "Posts aimés", "Fils d'actu"] as const;

type ProfileTab = (typeof BASE_TABS)[number] | "Listes" | "Kits de démarrage";

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
  const [profile, setProfile] = useState<any>(null);
  const [lists, setLists] = useState<ManagedList[]>([]);
  const [starterPacks, setStarterPacks] = useState<StarterPackView[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const isOwnProfile = checked && myHandle?.toLowerCase() === targetHandle.toLowerCase();

  useEffect(() => {
    if (!checked || !targetHandle) return;

    async function loadProfileData() {
      setLoadingProfile(true);
      setLoadError(null);

      try {
        const [profileData, listData, starterPackData] = await Promise.all([
          getActorProfile(targetHandle),
          getActorLists(targetHandle, 50).catch(() => ({
            items: [],
            cursor: undefined,
          })),
          getActorStarterPacks(targetHandle, 50).catch(() => ({
            items: [],
            cursor: undefined,
          })),
        ]);

        setProfile(profileData);
        setLists(listData.items);
        setStarterPacks(starterPackData.items);
      } catch (err) {
        console.error("Erreur lors de la récupération du profil :", err);
        setLoadError("Ce profil est introuvable.");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfileData();
  }, [checked, targetHandle]);

  const fetchProfilePosts = useCallback(
    async (cursor?: string) => {
      if (!checked || !targetHandle) {
        return { items: [], cursor: undefined };
      }

      const response = await getActorFeed(
        targetHandle,
        30,
        cursor
      );

      return {
        items: formatFeed(response.items),
        cursor: response.cursor,
      };
    },
    [checked, targetHandle]
  );

  const {
    items: posts,
    setItems: setPosts,
    loading: loadingPosts,
    loadingMore,
    hasMore,
    error: postsError,
    loadMore,
  } = useInfiniteFeed(
    fetchProfilePosts,
    [checked, targetHandle],
    {
      getItemKey: (post: any) => post.uri,
    }
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
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

  const displayedPosts = postSearchQuery.trim()
    ? posts.filter((p) => (p.record?.text || "").toLowerCase().includes(postSearchQuery.trim().toLowerCase()))
    : posts;

  const visibleTabs = useMemo<ProfileTab[]>(() => {
    const tabs: ProfileTab[] = [...BASE_TABS];

    if (lists.length > 0) tabs.push("Listes");
    if (starterPacks.length > 0) tabs.push("Kits de démarrage");

    return tabs;
  }, [lists.length, starterPacks.length]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab("Posts");
    }
  }, [activeTab, visibleTabs]);

  if (!checked || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Chargement du profil...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
          <Sidebar handle={myHandle} onLogout={handleLogout} />
          <main className="flex min-h-screen min-w-0 flex-1 items-center justify-center border-x border-kelo-border bg-white shadow-kelo">
            <p className="text-sm text-kelo-muted">{loadError}</p>
          </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
        <Sidebar handle={myHandle} onLogout={handleLogout} />

        <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="relative h-40 overflow-hidden bg-kelo-gradient sm:h-48 lg:h-56 xl:h-64">
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

          <div className="px-4 sm:px-6 lg:px-8">
            <div className="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="inline-block rounded-full border-4 border-white shadow-md">
                <Avatar
                  src={profile?.avatar}
                  fallback={(targetHandle[0] || "K").toUpperCase()}
                  size="lg"
                  gradient
                />
              </div>

              <div className="mb-2 flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                {isOwnProfile ? (
                  <Button variant="secondary" className="w-auto px-6">
                    Modifier le profil
                  </Button>
                ) : (
                  profile?.did && (
                    <>
                      <FollowButton did={profile.did} initialFollowingUri={profile?.viewer?.following ?? null} />
                      <ProfileMoreMenu
                        did={profile.did}
                        handle={targetHandle}
                        onBlocked={handleModeration}
                        onMuted={handleModeration}
                      />
                    </>
                  )
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-kelo-text">
                {profile?.displayName || targetHandle}
              </h1>

              <AccountBadges
                actor={profile}
                identitySize="md"
                certificationSize={28}
                gap="sm"
              />
            </div>

            <p className="font-semibold text-kelo-primary">@{targetHandle}</p>

            {profile?.description && (
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-kelo-text">{profile.description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
              {visibleTabs.map((tab) => (
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

            {activeTab === "Posts" && (
              <div className="py-3">
                <input
                  type="text"
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  placeholder={`🔍 Chercher dans les posts de @${targetHandle}...`}
                  className="w-full rounded-full bg-kelo-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
                />
              </div>
            )}
          </div>

          {activeTab === "Posts" && (
            <div className="divide-y divide-kelo-border">
              {displayedPosts.map((post) => (
                <PostCard
                  key={post.uri}
                  post={post}
                  isMine={isOwnProfile}
                  isBookmarked={isBookmarked(post.uri)}
                  replyOpen={activeReplyUri === post.uri}
                  replyText={replyText}
                  onToggleReply={() =>
                    setActiveReplyUri(
                      activeReplyUri === post.uri ? null : post.uri
                    )
                  }
                  onReplyTextChange={setReplyText}
                  onSendReply={() => {
                    setReplyText("");
                    setActiveReplyUri(null);
                  }}
                  onBookmark={() => toggleBookmark(post)}
                  onDelete={() => handleDelete(post.uri)}
                  onBlocked={handleModeration}
                  onMuted={handleModeration}
                />
              ))}

              {loadingPosts && (
                <div className="flex justify-center py-10">
                  <img
                    src="https://kelosocial.sirv.com/logo.png"
                    alt="Chargement"
                    className="h-10 w-10 animate-spin object-contain"
                  />
                </div>
              )}

              {!loadingPosts && postsError && (
                <p className="px-4 py-8 text-center text-sm text-kelo-danger">
                  {postsError}
                </p>
              )}

              {!loadingPosts &&
                !postsError &&
                displayedPosts.length === 0 && (
                  <p className="py-10 text-center text-sm text-kelo-muted">
                    {postSearchQuery.trim()
                      ? "Aucune publication ne correspond à cette recherche."
                      : "Aucune publication pour l’instant."}
                  </p>
                )}

              {!postSearchQuery.trim() && (
                <InfiniteScrollSentinel
                  onIntersect={loadMore}
                  disabled={loadingMore || !hasMore}
                />
              )}
            </div>
          )}

          {activeTab === "Listes" && (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:p-6 2xl:grid-cols-3">
              {lists.map((list) => (
                <Link
                  key={list.uri}
                  href={`/lists/${encodeURIComponent(list.uri)}`}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
                >
                  {list.avatar ? (
                    <img
                      src={list.avatar}
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kelo-gradient font-bold text-white">
                      {(list.name || "L").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-kelo-muted">
                        {list.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-kelo-muted">
                      {list.listItemCount ?? 0} membre
                      {(list.listItemCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "Kits de démarrage" && (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:p-6 2xl:grid-cols-3">
              {starterPacks.map((pack) => (
                <Link
                  key={pack.uri}
                  href={`/starter-packs/${encodeURIComponent(pack.uri)}`}
                  className="overflow-hidden rounded-2xl border border-kelo-border transition hover:bg-kelo-background/60"
                >
                  {pack.list?.avatar ? (
                    <img
                      src={pack.list.avatar}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-kelo-gradient text-4xl text-white">
                      🚀
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="truncate text-sm font-extrabold">
                      {pack.record?.name || pack.list?.name || "Kit"}
                    </h3>
                    {(pack.record?.description ||
                      pack.list?.description) && (
                      <p className="mt-1 line-clamp-2 text-xs text-kelo-muted">
                        {pack.record?.description ||
                          pack.list?.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-kelo-muted">
                      {pack.list?.listItemCount ?? 0} membre
                      {(pack.list?.listItemCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab !== "Posts" &&
            activeTab !== "Listes" &&
            activeTab !== "Kits de démarrage" && (
              <p className="py-10 text-center text-sm text-kelo-muted">
                Bientôt disponible.
              </p>
            )}
        </main>
    </div>
  );
}
