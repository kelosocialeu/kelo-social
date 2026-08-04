"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Users,
  Plus,
  List,
} from "lucide-react";
import {
  KELO_CURATED_LISTS,
  getListInfo,
} from "@/lib/atproto/lists";
import {
  getTrendingTopics,
  TrendingTopic,
} from "@/lib/atproto/trends";

const QUICK_LINKS = [
  {
    href: "/feed",
    label: "Découvrir",
    icon: Compass,
  },
  {
    href: "/feed",
    label: "Suivis",
    icon: Users,
  },
];

interface CuratedListDetails {
  uri: string;
  label: string;
  name?: string;
  avatar?: string;
  description?: string;
  listItemCount?: number;
}

export default function FeedsRail() {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [trendsError, setTrendsError] = useState(false);

  const [curatedLists, setCuratedLists] = useState<
    CuratedListDetails[]
  >([]);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    getTrendingTopics(5)
      .then(setTrends)
      .catch(() => setTrendsError(true));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCuratedLists() {
      setLoadingLists(true);

      try {
        const lists = await Promise.all(
          KELO_CURATED_LISTS.map(async (configuredList) => {
            try {
              const listInfo = await getListInfo(
                configuredList.uri
              );

              return {
                uri: configuredList.uri,
                label: configuredList.label,
                name:
                  listInfo?.name ||
                  configuredList.label,
                avatar: listInfo?.avatar,
                description: listInfo?.description,
                listItemCount: listInfo?.listItemCount,
              };
            } catch (error) {
              console.error(
                `Impossible de charger la liste ${configuredList.label}`,
                error
              );

              return {
                uri: configuredList.uri,
                label: configuredList.label,
                name: configuredList.label,
              };
            }
          })
        );

        if (!cancelled) {
          setCuratedLists(lists);
        }
      } finally {
        if (!cancelled) {
          setLoadingLists(false);
        }
      }
    }

    loadCuratedLists();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-kelo-border bg-white">
        {QUICK_LINKS.map(
          ({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 border-b border-kelo-border px-3 py-3 text-sm font-semibold text-kelo-text transition-colors hover:bg-kelo-background"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-kelo-background">
                <Icon className="h-4 w-4 text-kelo-primary" />
              </div>

              <span className="truncate">{label}</span>
            </Link>
          )
        )}

        {loadingLists && (
          <div className="border-b border-kelo-border px-3 py-4 text-center text-xs text-kelo-muted">
            Chargement des fils...
          </div>
        )}

        {!loadingLists &&
          curatedLists.map((list) => (
            <Link
              key={list.uri}
              href={`/feeds/list?uri=${encodeURIComponent(
                list.uri
              )}`}
              className="flex items-center gap-3 border-b border-kelo-border px-3 py-3 transition-colors hover:bg-kelo-background"
            >
              {list.avatar ? (
                <img
                  src={list.avatar}
                  alt={`Image de ${list.name || list.label}`}
                  className="h-9 w-9 flex-shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-kelo-gradient text-xs font-bold text-white">
                  {(list.name || list.label || "K")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-grow">
                <p className="truncate text-sm font-semibold text-kelo-text">
                  {list.name || list.label}
                </p>

                {typeof list.listItemCount === "number" && (
                  <p className="truncate text-xs text-kelo-muted">
                    {list.listItemCount} membre
                    {list.listItemCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </Link>
          ))}

        <Link
          href="/feeds"
          className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-kelo-background">
            <Plus className="h-4 w-4" />
          </div>

          <span className="truncate">
            Plus de fils d&apos;actu
          </span>
        </Link>
      </div>

      {!trendsError && trends.length > 0 && (
        <div className="rounded-2xl border border-kelo-border bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-kelo-text">
            Tendances
          </h3>

          <div className="flex flex-col gap-2.5">
            {trends.map((trend, index) => (
              <Link
                key={`${trend.topic}-${index}`}
                href={`/search?q=${encodeURIComponent(
                  trend.displayName || trend.topic
                )}`}
                className="flex items-center gap-2 text-sm text-kelo-text transition-colors hover:text-kelo-primary"
              >
                <span className="flex-shrink-0 text-kelo-muted">
                  {index + 1}.
                </span>

                <span className="truncate">
                  {trend.displayName || trend.topic}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
