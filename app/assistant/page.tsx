"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User, Wrench } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getStoredSession } from "@/services/auth.service";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starters = [
  "Lis mes notifications et résume-les.",
  "Regarde mon fil et dis-moi ce qui mérite mon attention.",
  "Publie : « Bonjour tout le monde 👋 »",
  "Recherche le compte @bsky.app et dis-moi ce que tu trouves.",
];

export default function AssistantPage() {
  const { checked, handle } = useRequireAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const session = getStoredSession();
    if (!session?.accessJwt) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setToolActivity(true);

    try {
      const response = await fetch("/api/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: session.accessJwt,
          messages: nextMessages,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "L'agent IA est indisponible.");

      setMessages((current) => [...current, { role: "assistant", content: data.text || "Action terminée." }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Une erreur est survenue.",
        },
      ]);
    } finally {
      setToolActivity(false);
      setLoading(false);
    }
  }

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-kelo-background text-kelo-text">
      <div className="flex min-h-screen">
        <Sidebar handle={handle} onLogout={() => { window.location.href = "/login"; }} />

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col">
            <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-xl md:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient text-white shadow-lg">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-extrabold">Kelo AI</h1>
                  <p className="text-xs text-kelo-muted">Agent MCP · connecté à votre compte @{handle}</p>
                </div>
                <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> MCP actif
                </span>
              </div>
            </header>

            <section className="flex-1 px-4 py-6 md:px-6">
              {messages.length === 0 ? (
                <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-kelo-gradient text-white shadow-xl">
                    <Sparkles className="h-9 w-9" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">Que voulez-vous que je fasse ?</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-kelo-muted">
                    Kelo AI peut lire votre compte et agir directement sur Kelo Social avec vos autorisations AT Protocol.
                  </p>

                  <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                    {starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => setInput(starter)}
                        className="rounded-2xl border border-kelo-border bg-white p-4 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-kelo-primary hover:shadow-md"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kelo-gradient text-white">
                          <Bot className="h-5 w-5" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "rounded-br-md bg-kelo-gradient text-white" : "rounded-bl-md border border-kelo-border bg-white text-kelo-text"}`}>
                        {message.content}
                      </div>
                      {message.role === "user" && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kelo-text text-white">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kelo-gradient text-white"><Bot className="h-5 w-5" /></div>
                      <div className="rounded-2xl border border-kelo-border bg-white px-4 py-3 text-sm text-kelo-muted">
                        <span className="inline-flex items-center gap-2">
                          {toolActivity && <Wrench className="h-4 w-4 animate-pulse" />}
                          L'agent travaille…
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </section>

            <div className="sticky bottom-0 border-t border-kelo-border bg-kelo-background/95 px-4 py-4 backdrop-blur-xl md:px-6">
              <form onSubmit={sendMessage} className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-kelo-border bg-white p-2 shadow-lg">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Demandez-moi d'agir sur Kelo Social…"
                  rows={1}
                  className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Envoyer"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-kelo-muted">
                L'agent agit uniquement avec les autorisations du compte connecté.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
