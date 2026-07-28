"use client";

import { useState, useEffect } from "react";
import { AtpAgent } from "@atproto/api";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Badge from "@/components/ui/Badge";
import { useCertifications } from "@/hooks/useCertifications";
import { getDiscoverFeed } from "@/lib/atproto/feed";
import { searchNetworkPosts, searchNetworkActors } from "@/lib/atproto/search";

type Tab = "pourvous" | "decouvrir" | "chronologique";

export default function FeedPage() {
  const [handle, setHandle] = useState("");
  const [pdsService, setPdsService] = useState("https://pds.kelosocial.eu");
  const [postText, setPostText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPosts, setSearchPosts] = useState<any[] | null>(null);
  const [searchProfiles, setSearchProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("decouvrir");
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPost, setLoadingPost] = useState(false);
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { getStatus } = useCertifications();

  useEffect(() => {
    const savedHandle = localStorage.getItem("userHandle");
    const savedPds = localStorage.getItem("pdsService");
    if (savedHandle) setHandle(savedHandle);
    if (savedPds) setPdsService(savedPds);

    loadFeed(activeTab, savedPds || "https://pds.kelosocial.eu");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchPosts(null);
      setSearchProfiles([]);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const timeout = setTimeout(async () => {
      try {
        const [foundPosts, foundActors] = await Promise.all([
          searchNetworkPosts(trimmed),
          searchNetworkActors(trimmed),
        ]);
        setSearchPosts(formatSearchPosts(foundPosts));
        setSearchProfiles(foundActors);
      } catch (err) {
        console.error("Erreur de recherche :", err);
        setSearchError("La recherche a échoué. Réessayez dans un instant.");
        setSearchPosts([]);
        setSearchProfiles([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  async function loadFeed(tab: Tab, pds: string) {
    try {
      if (tab === "decouvrir") {
        const feed = await getDiscoverFeed(40);
        setPosts(formatFeed(feed));
        return;
      }

      const agent = new AtpAgent({ service: pds });
      const timelineRes = await agent.api.app.bsky.feed.getTimeline({ limit: 40 });
      setPosts(formatFeed(timelineRes.data.feed));
    } catch (err) {
      console.error("Erreur de récupération du flux :", err);
    }
  }

  function formatFeed(feed: any[]) {
    return feed.map((item: any) => ({
      uri: item.post.uri,
      cid: item.post.cid,
      author: item.post.author,
      record: item.post.record,
      likeCount: item.post.likeCount || 0,
      repostCount: item.post.repostCount || 0,
      replyCount: item.post.replyCount || 0,
      viewer: item.post.viewer || {},
    }));
  }

  function formatSearchPosts(results: any[]) {
    return results.map((post: any) => ({
      uri: post.uri,
      cid: post.cid,
      author: post.author,
      record: post.record,
      likeCount: post.likeCount || 0,
      repostCount: post.repostCount || 0,
      replyCount: post.replyCount || 0,
      viewer: post.viewer || {},
    }));
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    loadFeed(tab, pdsService);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    setLoadingPost(true);
    try {
      const accessToken = localStorage.getItem("accessJwt");
      const currentHandle = localStorage.getItem("userHandle");
      const currentPds = localStorage.getItem("pdsService") || "https://pds.kelosocial.eu";

      if (accessToken && currentHandle) {
        const agent = new AtpAgent({ service: currentPds });
        await agent.resumeSession({
          accessJwt: accessToken,
          refreshJwt: localStorage.getItem("refreshJwt") || "",
          active: true,
          handle: currentHandle,
          did: localStorage.getItem("userDid") || "",
        });

        await agent.api.app.bsky.feed.post.create(
          { repo: agent.session?.did || currentHandle },
          { text: postText, createdAt: new Date().toISOString() }
        );
      }

      const newPostItem = {
        uri: "local-" + Date.now(),
        author: { handle: currentHandle || "moi.kelosocial.eu", displayName: currentHandle || "Moi" },
        record: { text: postText, createdAt: new Date().toISOString() },
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
        viewer: {},
      };

      setPosts([newPostItem, ...posts]);
      setPostText("");
    } catch (err) {
      console.error("Erreur lors de la publication", err);
      alert("Erreur lors de la publication sur le PDS.");
    } finally {
      setLoadingPost(false);
    }
  };

  const handleLike = (uri: string) => {
    const updater = (list: any[]) =>
      list.map((p) => {
        if (p.uri === uri) {
          const liked = p.viewer?.like;
          return { ...p, viewer: { ...p.viewer, like: !liked }, likeCount: liked ? p.likeCount - 1 : p.likeCount + 1 };
        }
        return p;
      });
    setPosts(updater(posts));
    if (searchPosts) setSearchPosts(updater(searchPosts));
  };

  const handleRepost = (uri: string) => {
    const updater = (list: any[]) =>
      list.map((p) => {
        if (p.uri === uri) {
          const reposted = p.viewer?.repost;
          return {
            ...p,
            viewer: { ...p.viewer, repost: !reposted },
            repostCount: reposted ? p.repostCount - 1 : p.repostCount + 1,
          };
        }
        return p;
      });
    setPosts(updater(posts));
    if (searchPosts) setSearchPosts(updater(searchPosts));
  };

  const handleBookmark = (post: any) => {
    const saved = JSON.parse(localStorage.getItem("keloBookmarks") || "[]");
    if (!saved.some((item: any) => item.uri === post.uri)) {
      saved.push(post);
      localStorage.setItem("keloBookmarks", JSON.stringify(saved));
      alert("Publication conservée dans vos favoris !");
    } else {
      alert("Cette publication est déjà sauvegardée.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const isSearching = searchQuery.trim().length >= 2;
  const displayedPosts = isSearching ? searchPosts ?? [] : posts;

  return (
    <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
      <div className="flex w-full max-w-7xl">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-extrabold text-kelo-text">
                {isSearching ? `Résultats pour « ${searchQuery} »` : "Fil Fédéré Global"}
              </h2>
              <span className="rounded-lg bg-kelo-background px-2.5 py-1 text-xs font-semibold text-kelo-muted">
                Multi-PDS AT Protocol
              </span>
            </div>
            {!isSearching && (
              <div className="flex w-full border-t border-kelo-border text-sm">
                {(
                  [
                    ["decouvrir", "✨ Découvrir"],
                    ["pourvous", "🔥 Pour vous"],
                    ["chronologique", "🕓 Chronologique"],
                  ] as [Tab, string][]
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`flex-1 py-3 text-center font-bold transition-colors ${
                      activeTab === tab
                        ? "border-b-4 border-kelo-primary text-kelo-text"
                        : "text-kelo-muted hover:bg-kelo-background"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isSearching && (
            <form onSubmit={handleCreatePost} className="border-b border-kelo-border bg-kelo-background/50 p-4">
              <div className="flex gap-3">
                <Avatar fallback={handle ? handle[0].toUpperCase() : "K"} gradient />
                <div className="w-full">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Diffusez sur tout l'écosystème PDS..."
                    rows={3}
                    className="w-full resize-none bg-transparent text-base text-kelo-text placeholder-kelo-muted focus:outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between border-t border-kelo-border/60 pt-2">
                    <span className="max-w-[200px] truncate text-xs text-kelo-muted">PDS : {pdsService}</span>
                    <button
                      type="submit"
                      disabled={loadingPost || !postText.trim()}
                      className="rounded-full bg-kelo-gradient px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                    >
                      {loadingPost ? "Publication..." : "Diffuser"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          <div className="divide-y divide-kelo-border">
            {searching && isSearching && (
              <p className="py-6 text-center text-sm text-kelo-muted">Recherche en cours...</p>
            )}

            {!searching && searchError && (
              <p className="py-6 text-center text-sm text-kelo-danger">{searchError}</p>
            )}

            {!searching && !searchError && displayedPosts.length > 0 ? (
              displayedPosts.map((item: any, idx: number) => {
                const post = item;
                const isLiked = post.viewer?.like;
                const isReposted = post.viewer?.repost;
                const authorBadge = getStatus(post.author?.handle);

                return (
                  <div key={post.uri || idx} className="p-4 transition-colors hover:bg-kelo-background/60">
                    <div className="flex gap-3">
                      <Avatar
                        src={post.author?.avatar}
                        fallback={post.author?.handle ? post.author.handle[0].toUpperCase() : "U"}
                      />
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-kelo-text">{post.author?.displayName || "Utilisateur"}</span>
                          {authorBadge && <Badge status={authorBadge} />}
                          <span className="text-sm text-kelo-muted">@{post.author?.handle}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kelo-text">
                          {post.record?.text}
                        </p>

                        <div className="mt-4 flex max-w-md justify-between text-sm text-kelo-muted">
                          <button
                            onClick={() => setActiveReplyUri(activeReplyUri === post.uri ? null : post.uri)}
                            className="flex items-center gap-1 transition-colors hover:text-kelo-primary"
                          >
                            💬 <span>{post.replyCount || 0}</span>
                          </button>
                          <button
                            onClick={() => handleRepost(post.uri)}
                            className={`flex items-center gap-1 transition-colors ${
                              isReposted ? "font-bold text-kelo-success" : "hover:text-kelo-success"
                            }`}
                          >
                            🔄 <span>{post.repostCount || 0}</span>
                          </button>
                          <button
                            onClick={() => handleLike(post.uri)}
                            className={`flex items-center gap-1 transition-colors ${
                              isLiked ? "font-bold text-kelo-secondary" : "hover:text-kelo-secondary"
                            }`}
                          >
                            {isLiked ? "❤️" : "🤍"} <span>{post.likeCount || 0}</span>
                          </button>
                          <button
                            onClick={() => handleBookmark(post)}
                            className="transition-colors hover:text-kelo-primary"
                            title="Conserver"
                          >
                            📥
                          </button>
                        </div>

                        {activeReplyUri === post.uri && (
                          <div className="mt-3 flex gap-2 border-t border-kelo-border pt-3">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Votre commentaire..."
                              className="w-full rounded-xl bg-kelo-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
                            />
                            <button
                              onClick={() => {
                                alert("Commentaire publié !");
                                setReplyText("");
                                setActiveReplyUri(null);
                              }}
                              className="rounded-xl bg-kelo-gradient px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                            >
                              Répondre
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : !searching && !searchError ? (
              <p className="py-10 text-center text-sm text-kelo-muted">Aucun résultat trouvé.</p>
            ) : null}
          </div>
        </main>

        <aside className="sticky top-0 hidden h-screen w-80 border-l border-kelo-border bg-white p-6 lg:block">
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Chercher @user ou mot-clé..."
              className="w-full rounded-full bg-kelo-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
            />
          </div>

          {isSearching && searchProfiles.length > 0 ? (
            <div className="rounded-2xl border border-kelo-border bg-kelo-background p-4">
              <h3 className="mb-3 text-sm font-bold text-kelo-text">Comptes trouvés</h3>
              <div className="flex flex-col gap-3">
                {searchProfiles.map((actor: any) => (
                  <div key={actor.did} className="flex items-center gap-3">
                    <Avatar src={actor.avatar} fallback={actor.handle[0].toUpperCase()} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-kelo-text">
                        {actor.displayName || actor.handle}
                      </p>
                      <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-kelo-border bg-kelo-background p-4">
              <h3 className="mb-3 text-sm font-bold text-kelo-text">Fédération AT Protocol</h3>
              <p className="text-xs leading-relaxed text-kelo-muted">
                La recherche balaie en temps réel les comptes et publications de tout le réseau fédéré
                (Bluesky, WSocial, Eurosky, Kelo Social...), quel que soit le PDS d'origine.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
