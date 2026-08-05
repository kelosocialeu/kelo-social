"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useBookmarks } from "@/hooks/useBookmarks";

import { getPostThread } from "@/lib/atproto/post-thread";
import { deleteOwnPost } from "@/lib/atproto/posts";
import { getStoredSession } from "@/services/auth.service";

interface FlattenedThreadPost {
  post: any;
  depth: number;
}

interface ViewPostThreadNode {
  post: any;
  replies?: unknown;
}

function flattenPost(view: any) {
  return {
    uri: view.uri,
    cid: view.cid,
    author: view.author,
    record: view.record,
    embed: view.embed,
    likeCount: view.likeCount || 0,
    repostCount: view.repostCount || 0,
    replyCount: view.replyCount || 0,
    viewer: view.viewer || {},
  };
}

function isViewPostThread(
  node: unknown
): node is ViewPostThreadNode {
  if (
    !node ||
    typeof node !== "object"
  ) {
    return false;
  }

  const candidate =
    node as ViewPostThreadNode;

  return (
    !!candidate.post &&
    typeof candidate.post.uri === "string"
  );
}

/**
 * Transforme récursivement l’arbre AT Protocol en liste d’affichage.
 *
 * Les réponses supprimées, bloquées ou indisponibles sont ignorées.
 */
function flattenReplies(
  replies: any[] = [],
  depth = 0
): FlattenedThreadPost[] {
  const result: FlattenedThreadPost[] = [];

  for (const reply of replies) {
    if (!isViewPostThread(reply)) {
      continue;
    }

    result.push({
      post: flattenPost(reply.post),
      depth,
    });

    if (
      Array.isArray(reply.replies) &&
      reply.replies.length > 0
    ) {
      result.push(
        ...flattenReplies(
          reply.replies,
          depth + 1
        )
      );
    }
  }

  return result;
}

function PostThreadContent() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const uri = searchParams.get("uri") || "";

  const [myDid, setMyDid] =
    useState<string | null>(null);

  const [rootPost, setRootPost] =
    useState<any>(null);

  const [threadReplies, setThreadReplies] =
    useState<FlattenedThreadPost[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [activeReplyUri, setActiveReplyUri] =
    useState<string | null>(null);

  const [replyText, setReplyText] =
    useState("");

  const {
    isBookmarked,
    toggleBookmark,
  } = useBookmarks();

  useEffect(() => {
    if (!checked) {
      return;
    }

    const session = getStoredSession();

    if (session) {
      setMyDid(session.did);
    }
  }, [checked]);

  useEffect(() => {
    if (!checked) {
      return;
    }

    if (!uri) {
      setRootPost(null);
      setThreadReplies([]);
      setError(
        "Aucune publication n’a été indiquée."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadThread() {
      setLoading(true);
      setError(null);
      setRootPost(null);
      setThreadReplies([]);

      try {
        const thread = await getPostThread(uri, {
          depth: 6,
          parentHeight: 20,
        });

        if (cancelled) {
          return;
        }

        if (!isViewPostThread(thread)) {
          setError(
            "Cette publication est introuvable, supprimée ou indisponible."
          );
          return;
        }

        setRootPost(flattenPost(thread.post));

        const replies = Array.isArray(
          thread.replies
        )
          ? thread.replies
          : [];

        setThreadReplies(
          flattenReplies(replies, 0)
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Impossible de charger la publication :",
          error
        );

        setError(
          "Impossible de charger cette publication."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadThread();

    return () => {
      cancelled = true;
    };
  }, [checked, uri]);

  const replyCountLabel = useMemo(() => {
    const count = threadReplies.length;

    if (count === 0) {
      return "Aucune réponse";
    }

    return `${count} réponse${
      count > 1 ? "s" : ""
    }`;
  }, [threadReplies.length]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleDelete = async (
    postUri: string
  ) => {
    if (
      !confirm(
        "Supprimer définitivement cette publication ?"
      )
    ) {
      return;
    }

    try {
      await deleteOwnPost(postUri);

      if (postUri === rootPost?.uri) {
        router.push("/feed");
        return;
      }

      setThreadReplies((previous) =>
        previous.filter(
          (item) => item.post.uri !== postUri
        )
      );
    } catch (error) {
      console.error(
        "Impossible de supprimer la publication :",
        error
      );

      alert(
        "Impossible de supprimer cette publication."
      );
    }
  };

  const handleReplySubmit = () => {
    setReplyText("");
    setActiveReplyUri(null);
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-kelo-border bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
          >
            ←
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-kelo-text sm:text-xl">
              Publication
            </h1>

            {!loading && !error && rootPost && (
              <p className="text-xs text-kelo-muted">
                {replyCountLabel}
              </p>
            )}
          </div>
        </header>

        {loading && (
          <div className="flex justify-center py-12">
            <img
              src="https://kelosocial.sirv.com/logo.png"
              alt="Chargement"
              className="h-12 w-12 animate-spin object-contain"
            />
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-kelo-danger">
              {error}
            </p>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-4 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text"
            >
              Retour
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          rootPost && (
            <div>
              <div className="border-b-4 border-kelo-background">
                <PostCard
                  post={rootPost}
                  isMine={
                    !!myDid &&
                    rootPost.author?.did === myDid
                  }
                  isBookmarked={isBookmarked(
                    rootPost.uri
                  )}
                  replyOpen={
                    activeReplyUri === rootPost.uri
                  }
                  replyText={replyText}
                  onToggleReply={() =>
                    setActiveReplyUri(
                      activeReplyUri === rootPost.uri
                        ? null
                        : rootPost.uri
                    )
                  }
                  onReplyTextChange={setReplyText}
                  onSendReply={handleReplySubmit}
                  onBookmark={() =>
                    toggleBookmark(rootPost)
                  }
                  onDelete={() =>
                    handleDelete(rootPost.uri)
                  }
                  disableThreadLink
                />
              </div>

              {threadReplies.length > 0 ? (
                <div className="divide-y divide-kelo-border">
                  {threadReplies.map(
                    ({ post, depth }) => {
                      const cappedDepth = Math.min(
                        depth,
                        4
                      );

                      return (
                        <div
                          key={post.uri}
                          className="relative"
                          style={{
                            paddingLeft:
                              cappedDepth > 0
                                ? `${Math.min(
                                    cappedDepth * 14,
                                    56
                                  )}px`
                                : undefined,
                          }}
                        >
                          {depth > 0 && (
                            <span
                              aria-hidden="true"
                              className="absolute bottom-0 top-0 w-px bg-kelo-border"
                              style={{
                                left: `${Math.max(
                                  cappedDepth * 14 - 7,
                                  7
                                )}px`,
                              }}
                            />
                          )}

                          <PostCard
                            post={post}
                            isMine={
                              !!myDid &&
                              post.author?.did === myDid
                            }
                            isBookmarked={isBookmarked(
                              post.uri
                            )}
                            replyOpen={
                              activeReplyUri === post.uri
                            }
                            replyText={replyText}
                            onToggleReply={() =>
                              setActiveReplyUri(
                                activeReplyUri === post.uri
                                  ? null
                                  : post.uri
                              )
                            }
                            onReplyTextChange={
                              setReplyText
                            }
                            onSendReply={handleReplySubmit}
                            onBookmark={() =>
                              toggleBookmark(post)
                            }
                            onDelete={() =>
                              handleDelete(post.uri)
                            }
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div
                    className="text-4xl"
                    aria-hidden="true"
                  >
                    💬
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-kelo-text">
                    Aucune réponse
                  </h2>

                  <p className="mt-2 text-sm text-kelo-muted">
                    Soyez la première personne à répondre
                    à cette publication.
                  </p>
                </div>
              )}
            </div>
          )}
      </main>
    </div>
  );
}

export default function PostThreadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
          <img
            src="https://kelosocial.sirv.com/logo.png"
            alt="Chargement"
            className="h-12 w-12 animate-spin object-contain"
          />
        </div>
      }
    >
      <PostThreadContent />
    </Suspense>
  );
}
