"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Button from "@/components/ui/Button";
import { getActorProfile, getActorFeed } from "@/lib/atproto/profile";

type BadgeType = "trusted-verifier" | "certified" | "none";

const TABS = ["Posts", "Réponses", "Média", "Vidéos", "Posts aimés", "Fils d'actu"] as const;

export default function ProfilePage() {
  const [handle, setHandle] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Posts");
  const [badgeType, setBadgeType] = useState<BadgeType>("none");

  useEffect(() => {
    const savedHandle = localStorage.getItem("userHandle") || "";
    setHandle(savedHandle);

    async function load() {
      try {
        const [profileData, feedData] = await Promise.all([
          getActorProfile(savedHandle),
          getActorFeed(savedHandle, 30),
        ]);
        setProfile(profileData);
        setPosts(feedData);

        if (savedHandle.includes("matte") || savedHandle.includes("admin")) {
          setBadgeType("trusted-verifier");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil :", err);
      } finally {
        setLoading(false);
      }
    }

    if (savedHandle) load();
    else setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Chargement de votre profil souverain...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
      <div className="flex w-full max-w-7xl">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="relative h-48 overflow-hidden bg-kelo-gradient">
            {profile?.banner ? (
              <img src={profile.banner} alt="Bannière" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-6xl font-extrabold text-white/90">
                  {(profile?.displayName || handle || "Kelo").split(" ")[0]}
                </span>
              </div>
            )}
          </div>

          <div className="px-6">
            <div className="-mt-12 flex items-end justify-between">
              <div className="rounded-full border-4 border-white bg-white shadow-md">
                <Avatar src={profile?.avatar} fallback={(handle[0] || "K").toUpperCase()} size="lg" gradient />
              </div>
              <Button variant="secondary" className="mb-2 w-auto px-6">
                Modifier le profil
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-kelo-text">{profile?.displayName || handle}</h1>

              {badgeType === "trusted-verifier" && (
                <span className="rounded-full border border-kelo-secondary/30 bg-kelo-secondary/10 px-3 py-1 text-xs font-bold text-kelo-secondary">
                  Certificateur de confiance
                </span>
              )}
              {badgeType === "certified" && (
                <span className="rounded-full border border-kelo-primary/30 bg-kelo-primary/10 px-3 py-1 text-xs font-bold text-kelo-primary">
                  Certifié
                </span>
              )}
            </div>

            <p className="font-semibold text-kelo-primary">@{handle}</p>

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
              posts.map((item: any) => (
                <div key={item.post.uri} className="p-4 hover:bg-kelo-background/60">
                  <div className="flex gap-3">
                    <Avatar
                      src={item.post.author?.avatar}
                      fallback={item.post.author?.handle ? item.post.author.handle[0].toUpperCase() : "U"}
                    />
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-kelo-text">{item.post.author?.displayName}</span>
                        <span className="text-sm text-kelo-muted">@{item.post.author?.handle}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kelo-text">
                        {item.post.record.text}
                      </p>
                      <span className="mt-2 block text-xs text-kelo-muted">
                        {new Date(item.post.record.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
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
