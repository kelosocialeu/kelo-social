"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getConversationMessages, sendConversationMessage, markConversationRead } from "@/lib/atproto/chat";
import { getStoredSession } from "@/services/auth.service";

export default function ConversationPage() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const convoId = params?.convoId as string;

  const [myDid, setMyDid] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!checked || !convoId) return;

    const session = getStoredSession();
    if (session) setMyDid(session.did);

    async function load() {
      try {
        const res = await getConversationMessages(convoId, 50);
        // L'API renvoie les plus récents en premier : on inverse pour un
        // affichage chronologique classique (haut = ancien, bas = récent).
        setMessages([...res.items].reverse());
        await markConversationRead(convoId);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger cette conversation.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [checked, convoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    try {
      const sent = await sendConversationMessage(convoId, text.trim());
      setMessages((prev) => [...prev, sent]);
      setText("");
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer ce message.");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
      <div className="flex w-full max-w-7xl">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="flex min-h-screen max-w-2xl flex-grow flex-col border-r border-kelo-border bg-white shadow-kelo">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
            <button
              onClick={() => router.push("/messages")}
              className="text-kelo-muted transition-colors hover:text-kelo-text"
            >
              ←
            </button>
            <h2 className="text-lg font-extrabold text-kelo-text">Discussion</h2>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            {loading && <p className="py-10 text-center text-sm text-kelo-muted">Chargement...</p>}
            {error && <p className="py-10 text-center text-sm text-kelo-danger">{error}</p>}

            {!loading &&
              !error &&
              messages.map((msg: any, idx: number) => {
                const isMine = msg.sender?.did === myDid;
                return (
                  <div key={msg.id || idx} className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                        isMine ? "bg-kelo-gradient text-white" : "bg-kelo-background text-kelo-text"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-kelo-border p-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-grow rounded-full bg-kelo-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-full bg-kelo-gradient px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
