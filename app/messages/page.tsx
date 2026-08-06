"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AccountBadges from "@/components/ui/AccountBadges";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";

import {
  listConversations,
  getOrCreateConversation,
  resolveHandleToDid,
} from "@/lib/atproto/chat";

import { getStoredSession } from "@/services/auth.service";

export default function MessagesPage() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();

  const [myDid, setMyDid] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const {
    checked: verificationChecked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  useEffect(() => {
    if (!checked) {
      return;
    }

    const session = getStoredSession();

    if (session) {
      setMyDid(session.did);
    }
  }, [checked]);

  const fetchConversations = useCallback(
    async (cursor?: string) => {
      if (!checked) {
        return {
          items: [],
          cursor: undefined,
        };
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
    hasMore,
    error,
    loadMore,
  } = useInfiniteFeed(
    fetchConversations,
    [checked],
    {
      getItemKey: (conversation: any) =>
        conversation.id,
    }
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleStartConversation = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!requireVerification()) {
      return;
    }

    const cleanHandle = newHandle.replace(/^@/, "").trim();

    if (!cleanHandle) {
      return;
    }

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
      <Sidebar
        handle={handle}
        onLogout={handleLogout}
      />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
          <div className="px-4 py-4 sm:px-5 lg:px-6">
            <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
              Discussions
            </h1>

            <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
              Retrouvez vos conversations ou démarrez-en une nouvelle.
            </p>
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
                  if (!requireVerification()) {
                    return;
                  }

                  setNewHandle(event.target.value);
                }}
                onFocus={() => {
                  if (!verified) {
                    requireVerification();
                  }
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
            const otherMember =
              conversation.members?.find(
                (member: any) => member.did !== myDid
              ) || conversation.members?.[0];

            const lastText =
              conversation.lastMessage?.text || "";

            const displayName =
              otherMember?.displayName ||
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
                  fallback={
                    otherMember?.handle
                      ? otherMember.handle[0].toUpperCase()
                      : "U"
                  }
                />

                <div className="min-w-0 flex-grow">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-grow">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="max-w-full truncate font-bold text-kelo-text">
                          {displayName}
                        </p>

                        <AccountBadges
                          actor={otherMember}
                          identitySize="sm"
                          certificationSize={15}
                          gap="xs"
                        />
                      </div>

                      {otherMember?.handle && (
                        <p className="truncate text-xs text-kelo-muted">
                          @{otherMember.handle}
                        </p>
                      )}
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

          {conversations.length === 0 &&
            !loading &&
            !error && (
              <div className="flex min-h-[calc(100vh-210px)] items-start justify-center px-6 py-12 sm:items-center">
                <div className="max-w-md text-center">
                  <div
                    className="text-4xl"
                    aria-hidden="true"
                  >
                    💬
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-kelo-text">
                    Aucune discussion
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
                    Entrez le handle d’un utilisateur pour démarrer votre
                    première conversation.
                  </p>
                </div>
              </div>
            )}

          {error && (
            <p className="px-4 py-8 text-center text-sm text-kelo-danger">
              {error}
            </p>
          )}

          {loading && (
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

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </div>
  );
}
