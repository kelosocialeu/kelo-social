"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { listConversations, getOrCreateConversation, resolveHandleToDid } from "@/lib/atproto/chat";
import { getStoredSession } from "@/services/auth.service";

export default function MessagesPage() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const [myDid, setMyDid] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (!checked) return;
    const session = getStoredSession();
    if (session) setMyDid(session.did);
  }, [checked]);

  const fetcher = async (cursor?: string) => {
    if (!checked) return { items: [], cursor: undefined };
    const res = await listConversations(30, cursor);
    return { items: res.items, cursor: res.cursor };
  };

  const { items: convos, loading, hasMore, error, loadMore } = useInfiniteFeed(fetcher, [checked]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    setStarting(true);
    setStartError(null);
    try {
      const cleanHandle = newHandle.replace(/^@/, "").trim();
      const did = await resolveHandleToDid(cleanHandle);
      const convo = await getOrCreateConversation(did);
      router.push(`/messages/${convo.id}`);
    } catch (err) {
      console.error(err);
      setStartError("Impossible de trouver ou de créer cette conversation.");
    } finally {
      setStarting(false);
    }
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
            <h2 className="text-xl font-extrabold text-kelo-text">Discussions</h2>
          </div>

          <form onSubmit={handleStartConversation} className="flex gap-2 border-b border-kelo-border p-4">
            <div className="flex-grow">
              <Input
                type="text"
                placeholder="Démarrer une discussion avec @handle..."
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
              />
            </div>
            <Button type="submit" loading={starting} loadingText="..." className="w-auto px-6">
              Aller
            </Button>
          </form>
          {startError && <p className="px-4 pb-2 text-sm text-kelo-danger">{startError}</p>}

          <div className="divide-y divide-kelo-border">
            {convos.map((convo: any) => {
              const other = convo.members?.find((m: any) => m.did !== myDid) || convo.members?.[0];
              const lastText = convo.lastMessage?.text || "";
              return (
                <Link
                  key={convo.id}
                  href={`/messages/${convo.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-kelo-background/60"
                >
                  <Avatar src={other?.avatar} fallback={other?.handle ? other.handle[0].toUpperCase() : "U"} />
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-kelo-text">{other?.displayName || other?.handle}</span>
                      {convo.unreadCount > 0 && (
                        <span className="rounded-full bg-kelo-gradient px-2 py-0.5 text-xs font-bold text-white">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-kelo-muted">{lastText || "Aucun message"}</p>
                  </div>
                </Link>
              );
            })}

            {convos.length === 0 && !loading && (
              <p className="py-10 text-center text-sm text-kelo-muted">Aucune discussion pour l'instant.</p>
            )}
            {error && <p className="py-6 text-center text-sm text-kelo-danger">{error}</p>}
            {loading && <p className="py-6 text-center text-sm text-kelo-muted">Chargement...</p>}
            <InfiniteScrollSentinel onIntersect={loadMore} disabled={loading || !hasMore} />
          </div>
        </main>
    </div>
  );
}
