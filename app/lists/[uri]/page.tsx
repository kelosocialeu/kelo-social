"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import VerificationBadge from "@/components/ui/VerificationBadge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  addListMember,
  getListMembers,
  ManagedList,
  removeListMember,
} from "@/lib/atproto/lists";
import { searchNetworkActors } from "@/lib/atproto/search";
import { getStoredSession } from "@/services/auth.service";

interface ListMemberItem {
  uri: string;
  subject: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
    labels?: unknown[];
    verification?: unknown;
  };
}

export default function ListDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { checked, handle } = useRequireAuth();

  const encodedUri = params?.uri as string;
  const listUri = useMemo(() => {
    try {
      return decodeURIComponent(encodedUri || "");
    } catch {
      return encodedUri || "";
    }
  }, [encodedUri]);

  const [myDid, setMyDid] = useState<string | null>(null);
  const [list, setList] = useState<ManagedList | null>(null);
  const [members, setMembers] = useState<ListMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [addingDid, setAddingDid] = useState<string | null>(null);
  const [removingUri, setRemovingUri] = useState<string | null>(null);

  useEffect(() => {
    if (!checked) return;

    const session = getStoredSession();
    if (session) {
      setMyDid(session.did);
    }
  }, [checked]);

  const loadList = useCallback(async () => {
    if (!checked || !listUri) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getListMembers(listUri, 50);

      setList(response.list as ManagedList);
      setMembers(response.items as ListMemberItem[]);
      setCursor(response.cursor);
    } catch (error) {
      console.error("Impossible de charger la liste :", error);
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de charger cette liste."
      );
    } finally {
      setLoading(false);
    }
  }, [checked, listUri]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);

    const timeout = setTimeout(async () => {
      try {
        const results = await searchNetworkActors(trimmed, 20);
        setSearchResults(results);
      } catch (error) {
        console.error("Recherche impossible :", error);
        setSearchError("La recherche a échoué.");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const existingMemberDids = useMemo(
    () => new Set(members.map((item) => item.subject.did)),
    [members]
  );

  const isOwner =
    !!myDid &&
    !!list?.creator?.did &&
    myDid === list.creator.did;

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);

    try {
      const response = await getListMembers(listUri, 50, cursor);

      setMembers((previous) => [
        ...previous,
        ...(response.items as ListMemberItem[]),
      ]);
      setCursor(response.cursor);
    } catch (error) {
      console.error("Impossible de charger plus de membres :", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddMember = async (actor: any) => {
    if (!isOwner || addingDid) return;

    setAddingDid(actor.did);

    try {
      const created = await addListMember(listUri, actor.did);

      setMembers((previous) => [
        {
          uri: created.uri,
          subject: actor,
        },
        ...previous,
      ]);
    } catch (error) {
      console.error("Impossible d'ajouter ce membre :", error);

      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter ce membre."
      );
    } finally {
      setAddingDid(null);
    }
  };

  const handleRemoveMember = async (item: ListMemberItem) => {
    if (!isOwner || removingUri) return;

    const confirmed = window.confirm(
      `Retirer @${item.subject.handle} de cette liste ?`
    );

    if (!confirmed) return;

    setRemovingUri(item.uri);

    try {
      await removeListMember(item.uri);

      setMembers((previous) =>
        previous.filter((member) => member.uri !== item.uri)
      );
    } catch (error) {
      console.error("Impossible de retirer ce membre :", error);

      alert(
        error instanceof Error
          ? error.message
          : "Impossible de retirer ce membre."
      );
    } finally {
      setRemovingUri(null);
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

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
            <button
              type="button"
              onClick={() => router.push("/lists")}
              aria-label="Retour aux listes"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-text"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-kelo-text sm:text-2xl">
                {list?.name || "Liste"}
              </h1>

              {list?.creator?.handle && (
                <p className="truncate text-xs text-kelo-muted sm:text-sm">
                  par @{list.creator.handle}
                </p>
              )}
            </div>
          </div>
        </header>

        {loading && (
          <p className="px-4 py-10 text-center text-sm text-kelo-muted">
            Chargement de la liste...
          </p>
        )}

        {!loading && error && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-kelo-danger">{error}</p>

            <button
              type="button"
              onClick={loadList}
              className="mt-4 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && list && (
          <>
            <section className="border-b border-kelo-border px-4 py-5 sm:px-5 lg:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {list.avatar ? (
                  <img
                    src={list.avatar}
                    alt={`Avatar de ${list.name}`}
                    className="h-24 w-24 flex-shrink-0 rounded-3xl border border-kelo-border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-3xl bg-kelo-gradient text-white">
                    <Users className="h-10 w-10" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-extrabold text-kelo-text">
                    {list.name}
                  </h2>

                  {list.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kelo-muted">
                      {list.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-sm text-kelo-muted">
                    <Users className="h-4 w-4" />
                    <span>
                      {members.length} membre
                      {members.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {isOwner && (
              <section className="border-b border-kelo-border px-4 py-5 sm:px-5 lg:px-6">
                <h2 className="text-base font-extrabold text-kelo-text">
                  Ajouter des membres
                </h2>

                <p className="mt-1 text-xs text-kelo-muted">
                  Recherchez un compte sur l’ensemble du réseau fédéré.
                </p>

                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />

                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher un nom ou un @handle..."
                    className="w-full rounded-full bg-kelo-background py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-kelo-primary"
                  />
                </div>

                {searching && (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-kelo-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recherche...
                  </div>
                )}

                {!searching && searchError && (
                  <p className="py-5 text-center text-sm text-kelo-danger">
                    {searchError}
                  </p>
                )}

                {!searching &&
                  !searchError &&
                  query.trim().length >= 2 && (
                    <div className="mt-4 divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
                      {searchResults.length > 0 ? (
                        searchResults.map((actor: any) => {
                          const alreadyAdded =
                            existingMemberDids.has(actor.did);

                          return (
                            <div
                              key={actor.did}
                              className="flex items-center gap-3 px-4 py-3"
                            >
                              <Link
                                href={`/profile/${actor.handle}`}
                                className="flex min-w-0 flex-1 items-center gap-3"
                              >
                                <Avatar
                                  src={actor.avatar}
                                  fallback={
                                    actor.handle?.[0]?.toUpperCase() || "U"
                                  }
                                />

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="truncate text-sm font-bold text-kelo-text">
                                      {actor.displayName || actor.handle}
                                    </p>

                                    <VerificationBadge actor={actor} />
                                  </div>

                                  <p className="truncate text-xs text-kelo-muted">
                                    @{actor.handle}
                                  </p>
                                </div>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleAddMember(actor)}
                                disabled={
                                  alreadyAdded || addingDid === actor.did
                                }
                                className={`flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                                  alreadyAdded
                                    ? "bg-kelo-background text-kelo-muted"
                                    : "bg-kelo-gradient text-white hover:opacity-90"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {addingDid === actor.did ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : alreadyAdded ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}

                                {alreadyAdded ? "Ajouté" : "Ajouter"}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="px-4 py-8 text-center text-sm text-kelo-muted">
                          Aucun compte trouvé.
                        </p>
                      )}
                    </div>
                  )}
              </section>
            )}

            <section>
              <div className="border-b border-kelo-border px-4 py-4 sm:px-5 lg:px-6">
                <h2 className="text-base font-extrabold text-kelo-text">
                  Membres
                </h2>
              </div>

              <div className="divide-y divide-kelo-border">
                {members.length > 0 ? (
                  members.map((item) => (
                    <div
                      key={item.uri}
                      className="flex items-center gap-3 px-4 py-4 sm:px-5 lg:px-6"
                    >
                      <Link
                        href={`/profile/${item.subject.handle}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <Avatar
                          src={item.subject.avatar}
                          fallback={
                            item.subject.handle?.[0]?.toUpperCase() || "U"
                          }
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-bold text-kelo-text">
                              {item.subject.displayName ||
                                item.subject.handle}
                            </p>

                            <VerificationBadge actor={item.subject} />
                          </div>

                          <p className="truncate text-xs text-kelo-muted">
                            @{item.subject.handle}
                          </p>
                        </div>
                      </Link>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(item)}
                          disabled={removingUri === item.uri}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-danger disabled:opacity-50"
                          title="Retirer de la liste"
                        >
                          {removingUri === item.uri ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Users className="mx-auto h-9 w-9 text-kelo-muted" />

                    <h3 className="mt-4 text-lg font-bold text-kelo-text">
                      Aucun membre
                    </h3>

                    <p className="mt-2 text-sm text-kelo-muted">
                      Cette liste ne contient encore aucun compte.
                    </p>
                  </div>
                )}
              </div>

              {cursor && (
                <div className="border-t border-kelo-border px-4 py-5 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:opacity-50"
                  >
                    {loadingMore && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    Charger plus
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
