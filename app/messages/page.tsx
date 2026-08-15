"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings2, UsersRound, X } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AccountBadges from "@/components/ui/AccountBadges";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import MessagingSection from "@/components/settings/MessagingSection";
import GroupCreationDialog from "@/components/messages/GroupCreationDialog";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

import {
  listConversations,
  getOrCreateConversation,
  resolveHandleToDid,
} from "@/lib/atproto/chat";

import { getStoredSession } from "@/services/auth.service";

const CONVERSATIONS_REFRESH_MS = 15_000;

export default function MessagesPage() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();

  const [myDid, setMyDid] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showMessagingSettings, setShowMessagingSettings] = useState(false);
  const [showGroupCreation, setShowGroupCreation] = useState(false);

  const {
    checked: verificationChecked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  useEffect(() => {
    if (!checked) return;

    const session = getStoredSession();
    if (session) setMyDid(session.did);
  }, [checked]);

  const fetchConversations = useCallback(
    async (cursor?: string) => {
      if (!checked) {
        return { items: [], cursor: undefined };
      }

      const response = await listConversations(30, cursor);

      return {
        items: response.items,
        cursor: response.cursor,
      };
    },
    [checked]
  );

  const {
    items: conversations,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useInfiniteFeed(
    fetchConversations,
    [checked],
    {
      cacheKey: "messages:conversations",
      staleTimeMs: 10_000,
      getItemKey: (conversation: any) =>
        conversation.id,
    }
  );

  useVisibleInterval(
    refresh,
    CONVERSATIONS_REFRESH_MS,
    checked
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleStartConversation = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!requireVerification()) return;

    const cleanHandle = newHandle.replace(/^@/, "").trim();
    if (!cleanHandle) return;

    setStarting(true);
    setStartError(null);

    try {
      const did = await resolveHandleToDid(cleanHandle);
      const conversation = await getOrCreateConversation(did);
      router.push(`/messages/${conversation.id}`);
    } catch (error) {
      console.error(
        "Impossible de démarrer la conversation :",
        error
      );
      setStartError(
        "Impossible de trouver ou de créer cette conversation."
      );
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

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 lg:px-6">
            <div>
              <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
                Discussions
              </h1>
              <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
                Retrouvez vos conversations ou démarrez-en une nouvelle.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {refreshing && conversations.length > 0 && (
                <span className="hidden text-xs text-kelo-muted sm:inline">
                  Actualisation…
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!requireVerification()) return;
                  setShowGroupCreation(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-kelo-border px-3 text-sm font-bold text-kelo-text transition hover:bg-kelo-background"
                aria-label="Créer un groupe"
                title="Créer un groupe"
              >
                <UsersRound className="h-4 w-4" />
                <span className="hidden sm:inline">Créer un groupe</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMessagingSettings(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-kelo-border px-3 text-sm font-bold text-kelo-text transition hover:bg-kelo-background"
                aria-label="Paramètres de messagerie"
                title="Paramètres de messagerie"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Paramètres</span>
              </button>
            </div>
          </div>
        </div>

        {!verified && verificationChecked && (
          <button
            type="button"
            onClick={requireVerification}
            className="w-full border-b border-kelo-border bg-kelo-background px-4 py-3 text-left text-sm sm:px-5 lg:px-6"
          >
            <span className="font-bold text-kelo-text">
              Vérification requise
            </span>
            <span className="ml-2 text-kelo-muted">
              Vous pouvez lire vos discussions, mais pas en démarrer une nouvelle.
            </span>
          </button>
        )}

        <form
          onSubmit={handleStartConversation}
          className="border-b border-kelo-border px-4 py-4 sm:px-5 lg:px-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                type="text"
                placeholder="Démarrer une discussion avec @handle..."
                value={newHandle}
                onChange={(event) => {
                  if (!requireVerification()) return;
                  setNewHandle(event.target.value);
                }}
                onFocus={() => {
                  if (!verified) requireVerification();
                }}
                readOnly={!verified}
              />
            </div>

            <Button
              type="submit"
              loading={starting}
              loadingText="..."
              disabled={!verified}
              className="w-full px-6 sm:w-auto"
            >
              Aller
            </Button>
          </div>

          {startError && (
            <p className="mt-3 text-sm text-kelo-danger">
              {startError}
            </p>
          )}
        </form>

        <div className="divide-y divide-kelo-border">
          {conversations.map((conversation: any) => {
            const otherMembers = (conversation.members || []).filter(
              (member: any) => member.did !== myDid
            );
            const isGroup = otherMembers.length > 1;
            const otherMember = otherMembers[0] || conversation.members?.[0];

            const lastText = conversation.lastMessage?.text || "";
            const displayName = isGroup
              ? `Groupe · ${(conversation.members || []).length} membres`
              : otherMember?.displayName ||
                otherMember?.handle ||
                "Utilisateur";

            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-kelo-background/60 sm:px-5 lg:px-6"
              >
                <Avatar
                  src={otherMember?.avatar}
                  fallback={isGroup ? "G" : otherMember?.handle?.[0]?.toUpperCase() || "U"}
                />

                <div className="min-w-0 flex-grow">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-grow">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="max-w-full truncate font-bold text-kelo-text">
                          {displayName}
                        </p>
                        {!isGroup && (
                          <AccountBadges
                            actor={otherMember}
                            identitySize="sm"
                            certificationSize={15}
                            gap="xs"
                          />
                        )}
                      </div>

                      {isGroup ? (
                        <p className="truncate text-xs text-kelo-muted">
                          {otherMembers.slice(0, 3).map((member: any) => `@${member.handle}`).join(" · ")}
                          {otherMembers.length > 3 ? ` · +${otherMembers.length - 3}` : ""}
                        </p>
                      ) : otherMember?.handle ? (
                        <p className="truncate text-xs text-kelo-muted">
                          @{otherMember.handle}
                        </p>
                      ) : null}
                    </div>

                    {conversation.unreadCount > 0 && (
                      <span className="flex-shrink-0 rounded-full bg-kelo-gradient px-2.5 py-1 text-xs font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-sm text-kelo-muted">
                    {lastText || "Aucun message"}
                  </p>
                </div>
              </Link>
            );
          })}

          {conversations.length === 0 && !loading && !error && (
            <div className="flex min-h-[calc(100vh-210px)] items-start justify-center px-6 py-12 sm:items-center">
              <div className="max-w-md text-center">
                <div className="text-4xl" aria-hidden="true">💬</div>
                <h2 className="mt-4 text-lg font-bold text-kelo-text">
                  Aucune discussion
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
                  Entrez le handle d’un utilisateur ou créez un groupe pour démarrer votre première conversation.
                </p>
              </div>
            </div>
          )}

          {error && conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-kelo-danger">
              {error}
            </p>
          )}

          {loading && conversations.length === 0 && (
            <div className="flex justify-center py-10">
              <img
                src="https://kelosocial.sirv.com/logo.png"
                alt="Chargement"
                className="h-10 w-10 animate-spin object-contain"
              />
            </div>
          )}

          <InfiniteScrollSentinel
            onIntersect={loadMore}
            disabled={loadingMore || !hasMore}
          />
        </div>
      </main>

      <GroupCreationDialog
        open={showGroupCreation}
        onClose={() => setShowGroupCreation(false)}
        onCreated={(conversationId) => {
          setShowGroupCreation(false);
          router.push(`/messages/${conversationId}`);
        }}
      />

      {showMessagingSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowMessagingSettings(false)}>
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="messaging-settings-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-kelo-border bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
              <div>
                <h2 id="messaging-settings-title" className="text-lg font-extrabold text-kelo-text">Paramètres de messagerie</h2>
                <p className="mt-0.5 text-xs text-kelo-muted">Les mêmes réglages que dans Paramètres, synchronisés avec AT Protocol.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMessagingSettings(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-kelo-background"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <MessagingSection />
          </div>
        </div>
      )}

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </div>
  );
}
