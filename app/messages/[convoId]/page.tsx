"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

import {
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
} from "@/lib/atproto/chat";

import { getStoredSession } from "@/services/auth.service";

const MESSAGE_REFRESH_MS = 5_000;

function mergeMessages(
  previous: any[],
  incoming: any[]
): any[] {
  const map = new Map<string, any>();

  for (const message of previous) {
    map.set(
      String(message.id || `${message.sentAt}-${message.text}`),
      message
    );
  }

  for (const message of incoming) {
    map.set(
      String(message.id || `${message.sentAt}-${message.text}`),
      message
    );
  }

  return Array.from(map.values()).sort((a, b) => {
    const first = new Date(a.sentAt || a.createdAt || 0).getTime();
    const second = new Date(b.sentAt || b.createdAt || 0).getTime();
    return first - second;
  });
}

export default function ConversationPage() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const convoId = params?.convoId as string;

  const [myDid, setMyDid] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    checked: verificationChecked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  const loadConversation = useCallback(
    async (silent = false) => {
      if (!checked || !convoId) return;

      if (silent) setRefreshing(true);
      else setLoading(true);

      if (!silent) setError(null);

      try {
        const response = await getConversationMessages(
          convoId,
          50
        );

        const ordered = [...response.items].reverse();

        setMessages((previous) =>
          silent
            ? mergeMessages(previous, ordered)
            : ordered
        );

        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
          await markConversationRead(convoId);
        }
      } catch (loadError) {
        console.error(
          "Impossible de charger la conversation :",
          loadError
        );

        if (!silent) {
          setError(
            "Impossible de charger cette conversation."
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [checked, convoId]
  );

  useEffect(() => {
    if (!checked || !convoId) return;

    const session = getStoredSession();
    if (session) setMyDid(session.did);

    void loadConversation(false);
  }, [checked, convoId, loadConversation]);

  useVisibleInterval(
    () => loadConversation(true),
    MESSAGE_REFRESH_MS,
    checked && !!convoId
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const otherUser = useMemo(() => {
    const receivedMessage = messages.find(
      (message: any) =>
        message.sender?.did &&
        message.sender.did !== myDid
    );

    if (!receivedMessage?.sender) return null;

    return {
      ...receivedMessage.sender,
      displayName:
        receivedMessage.sender.displayName ||
        receivedMessage.sender.handle ||
        "Utilisateur",
    };
  }, [messages, myDid]);

  const handleSend = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!requireVerification()) return;

    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    setSending(true);

    try {
      const sentMessage = await sendConversationMessage(
        convoId,
        trimmedText
      );

      setMessages((previous) =>
        mergeMessages(previous, [sentMessage])
      );
      setText("");
    } catch (sendError) {
      console.error(
        "Impossible d’envoyer le message :",
        sendError
      );
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
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="flex min-h-screen min-w-0 flex-1 flex-col border-x border-kelo-border bg-white shadow-kelo">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center gap-3 border-b border-kelo-border bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6">
          <button
            type="button"
            onClick={() => router.push("/messages")}
            aria-label="Retour aux discussions"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
          >
            ←
          </button>

          {otherUser?.handle ? (
            <Link
              href={`/profile/${otherUser.handle}`}
              className="flex min-w-0 items-center gap-3 rounded-xl transition-opacity hover:opacity-80"
            >
              <Avatar
                src={otherUser.avatar}
                fallback={otherUser.handle?.[0]?.toUpperCase() || "U"}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="max-w-full truncate text-base font-extrabold text-kelo-text sm:text-lg">
                    {otherUser.displayName}
                  </h1>
                  <AccountBadges
                    actor={otherUser}
                    identitySize="sm"
                    certificationSize={15}
                    gap="xs"
                  />
                </div>
                <p className="truncate text-xs text-kelo-muted sm:text-sm">
                  @{otherUser.handle}
                </p>
              </div>
            </Link>
          ) : (
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-kelo-text">
                Discussion
              </h1>
              <p className="text-xs text-kelo-muted">
                Conversation privée
              </p>
            </div>
          )}

          {refreshing && messages.length > 0 && (
            <span className="ml-auto text-xs text-kelo-muted">
              Actualisation…
            </span>
          )}
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-6">
            {loading && messages.length === 0 && (
              <p className="py-10 text-center text-sm text-kelo-muted">
                Chargement...
              </p>
            )}

            {error && messages.length === 0 && (
              <p className="py-10 text-center text-sm text-kelo-danger">
                {error}
              </p>
            )}

            {messages.map((message: any, index: number) => {
              const isMine = message.sender?.did === myDid;
              const senderHandle =
                message.sender?.handle || otherUser?.handle;
              const senderAvatar =
                message.sender?.avatar || otherUser?.avatar;

              return (
                <div
                  key={message.id || index}
                  className={`mb-4 flex items-end gap-2 ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isMine && senderHandle && (
                    <Link
                      href={`/profile/${senderHandle}`}
                      className="flex-shrink-0 transition-opacity hover:opacity-80"
                    >
                      <Avatar
                        src={senderAvatar}
                        fallback={senderHandle[0]?.toUpperCase() || "U"}
                        size="sm"
                      />
                    </Link>
                  )}

                  <div
                    className={`max-w-[78%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[68%] lg:max-w-[60%] ${
                      isMine
                        ? "rounded-br-md bg-kelo-gradient text-white"
                        : "rounded-bl-md bg-kelo-background text-kelo-text"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}

            {!loading && !error && messages.length === 0 && (
              <div className="flex min-h-[50vh] items-center justify-center px-6">
                <div className="max-w-sm text-center">
                  <div className="text-4xl" aria-hidden="true">💬</div>
                  <h2 className="mt-4 text-lg font-bold text-kelo-text">
                    Commencez la discussion
                  </h2>
                  <p className="mt-2 text-sm text-kelo-muted">
                    Envoyez votre premier message.
                  </p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {!verified && verificationChecked && (
            <button
              type="button"
              onClick={requireVerification}
              className="border-t border-kelo-border bg-kelo-background px-4 py-3 text-left text-sm text-kelo-muted sm:px-5 lg:px-6"
            >
              <span className="font-bold text-kelo-text">
                Vérification requise :
              </span>{" "}
              vous pouvez lire cette discussion, mais pas envoyer de message.
            </button>
          )}

          <form
            onSubmit={handleSend}
            className="sticky bottom-0 border-t border-kelo-border bg-white/95 px-3 py-3 backdrop-blur-md sm:px-5 lg:px-6"
          >
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={text}
                onChange={(event) => {
                  if (!requireVerification()) return;
                  setText(event.target.value);
                }}
                onFocus={() => {
                  if (!verified) requireVerification();
                }}
                readOnly={!verified}
                placeholder={
                  verified
                    ? "Écrire un message..."
                    : "Vérifiez votre compte pour répondre..."
                }
                autoComplete="off"
                className="min-w-0 flex-1 rounded-full bg-kelo-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary read-only:cursor-not-allowed read-only:opacity-60"
              />

              <button
                type="submit"
                disabled={sending || !text.trim() || !verified}
                className="flex-shrink-0 rounded-full bg-kelo-gradient px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
              >
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        </section>
      </main>

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </div>
  );
}
