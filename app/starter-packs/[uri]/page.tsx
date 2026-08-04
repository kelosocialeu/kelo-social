"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  Rocket,
  Newspaper,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import VerificationBadge from "@/components/ui/VerificationBadge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getStarterPacks,
  StarterPackView,
} from "@/lib/atproto/starter-packs";
import {
  addListMember,
  getListMembers,
  removeListMember,
} from "@/lib/atproto/lists";
import { searchNetworkActors } from "@/lib/atproto/search";
import { getStoredSession } from "@/services/auth.service";

export default function StarterPackDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { checked, handle } = useRequireAuth();

  const packUri = useMemo(() => {
    try {
      return decodeURIComponent((params?.uri as string) || "");
    } catch {
      return (params?.uri as string) || "";
    }
  }, [params]);

  const [myDid, setMyDid] = useState<string | null>(null);
  const [pack, setPack] = useState<StarterPackView | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [addingDid, setAddingDid] = useState<string | null>(null);
  const [removingUri, setRemovingUri] = useState<string | null>(null);

  useEffect(() => {
    if (!checked) return;

    const session = getStoredSession();
    if (session) setMyDid(session.did);

    async function load() {
      setLoading(true);

      try {
        const [loadedPack] = await getStarterPacks([packUri]);

        if (!loadedPack) {
          throw new Error("Kit de démarrage introuvable.");
        }

        setPack(loadedPack);

        const listUri =
          loadedPack.record?.list || loadedPack.list?.uri;

        if (listUri) {
          const listData = await getListMembers(listUri, 100);
          setMembers(listData.items);
        }
      } catch (error) {
        console.error(error);
        setError(
          error instanceof Error
            ? error.message
            : "Impossible de charger ce kit."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [checked, packUri]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);

    const timeout = setTimeout(async () => {
      try {
        setResults(await searchNetworkActors(trimmed, 20));
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const listUri = pack?.record?.list || pack?.list?.uri;
  const isOwner = !!myDid && pack?.creator?.did === myDid;
  const memberDids = new Set(
    members.map((item) => item.subject?.did)
  );

  const handleAdd = async (actor: any) => {
    if (!listUri || !isOwner) return;

    setAddingDid(actor.did);

    try {
      const created = await addListMember(listUri, actor.did);

      setMembers((previous) => [
        { uri: created.uri, subject: actor },
        ...previous,
      ]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Ajout impossible."
      );
    } finally {
      setAddingDid(null);
    }
  };

  const handleRemove = async (item: any) => {
    if (!isOwner) return;

    setRemovingUri(item.uri);

    try {
      await removeListMember(item.uri);
      setMembers((previous) =>
        previous.filter((member) => member.uri !== item.uri)
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
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-kelo-border bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6">
          <button
            onClick={() => router.push("/starter-packs")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-kelo-muted hover:bg-kelo-background"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="truncate text-xl font-extrabold sm:text-2xl">
            {pack?.record?.name || "Kit de démarrage"}
          </h1>
        </header>

        {loading && (
          <p className="py-10 text-center text-sm text-kelo-muted">
            Chargement...
          </p>
        )}

        {!loading && error && (
          <p className="py-10 text-center text-sm text-kelo-danger">
            {error}
          </p>
        )}

        {!loading && !error && pack && (
          <>
            <section className="border-b border-kelo-border">
              {pack.list?.avatar ? (
                <img
                  src={pack.list.avatar}
                  alt=""
                  className="h-56 w-full object-cover sm:h-64"
                />
              ) : (
                <div className="flex h-56 items-center justify-center bg-kelo-gradient text-white sm:h-64">
                  <Rocket className="h-16 w-16" />
                </div>
              )}

              <div className="px-4 py-5 sm:px-5 lg:px-6">
                <h2 className="text-2xl font-extrabold">
                  {pack.record?.name}
                </h2>

                {pack.record?.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kelo-muted">
                    {pack.record.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-kelo-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {members.length} membre
                    {members.length > 1 ? "s" : ""}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Newspaper className="h-4 w-4" />
                    {pack.record?.feeds?.length || 0} fil
                    {(pack.record?.feeds?.length || 0) > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </section>

            {isOwner && (
              <section className="border-b border-kelo-border px-4 py-5 sm:px-5 lg:px-6">
                <h2 className="font-extrabold">
                  Ajouter des comptes
                </h2>

                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher un compte..."
                    className="w-full rounded-full bg-kelo-background py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-kelo-primary"
                  />
                </div>

                {searching && (
                  <div className="flex justify-center py-5">
                    <Loader2 className="h-5 w-5 animate-spin text-kelo-muted" />
                  </div>
                )}

                {!searching && query.trim().length >= 2 && (
                  <div className="mt-4 divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
                    {results.map((actor) => {
                      const added = memberDids.has(actor.did);

                      return (
                        <div
                          key={actor.did}
                          className="flex items-center gap-3 p-4"
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
                                <p className="truncate text-sm font-bold">
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
                            onClick={() => handleAdd(actor)}
                            disabled={added || addingDid === actor.did}
                            className="inline-flex items-center gap-1 rounded-full bg-kelo-gradient px-3 py-2 text-xs font-bold text-white disabled:bg-kelo-background disabled:text-kelo-muted"
                          >
                            {addingDid === actor.did ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            {added ? "Ajouté" : "Ajouter"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="border-b border-kelo-border px-4 py-4 sm:px-5 lg:px-6">
                <h2 className="font-extrabold">Comptes du kit</h2>
              </div>

              <div className="divide-y divide-kelo-border">
                {members.map((item) => (
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
                        <p className="truncate text-sm font-bold">
                          {item.subject.displayName ||
                            item.subject.handle}
                        </p>
                        <p className="truncate text-xs text-kelo-muted">
                          @{item.subject.handle}
                        </p>
                      </div>
                    </Link>

                    {isOwner && (
                      <button
                        onClick={() => handleRemove(item)}
                        disabled={removingUri === item.uri}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-muted hover:bg-kelo-background hover:text-kelo-danger"
                      >
                        {removingUri === item.uri ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
