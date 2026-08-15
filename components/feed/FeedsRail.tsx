"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Users,
  Plus,
  List,
  Newspaper,
} from "lucide-react";
import {
  getPinnedSavedItemDetails,
  SavedItemDetails,
} from "@/lib/atproto/feeds";
import {
  getTrendingTopics,
  TrendingTopic,
} from "@/lib/atproto/trends";

const QUICK_LINKS = [
  { href: "/feed", label: "Découvrir", icon: Compass },
  { href: "/feed", label: "Suivis", icon: Users },
];

function getPinnedItemHref(item: SavedItemDetails): string {
  if (item.type === "list") return `/feeds/list?uri=${encodeURIComponent(item.uri)}`;
  return `/feeds/view?uri=${encodeURIComponent(item.uri)}`;
}

function getPinnedItemName(item: SavedItemDetails): string {
  return item.type === "list" ? item.name : item.displayName;
}

function getPinnedItemSubtitle(item: SavedItemDetails): string {
  if (item.type === "list") {
    if (typeof item.listItemCount === "number") {
      return `${item.listItemCount} membre${item.listItemCount > 1 ? "s" : ""}`;
    }
    return "Liste";
  }
  if (item.creator?.handle) return `par @${item.creator.handle}`;
  return "Fil d’actu";
}

function getPinnedItemInitial(item: SavedItemDetails): string {
  return getPinnedItemName(item)?.charAt(0)?.toUpperCase() || "K";
}

export default function FeedsRail() {
  const [pinnedItems, setPinnedItems] = useState<SavedItemDetails[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(true);
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [trendsError, setTrendsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPinnedItems() {
      setLoadingPinned(true);
      try {
        const items = await getPinnedSavedItemDetails();
        if (!cancelled) setPinnedItems(items);
      } catch (error) {
        console.warn("Éléments épinglés temporairement indisponibles :", error);
        if (!cancelled) setPinnedItems([]);
      } finally {
        if (!cancelled) setLoadingPinned(false);
      }
    }

    void loadPinnedItems();
    const handleFocus = () => void loadPinnedItems();
    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    getTrendingTopics(5)
      .then(setTrends)
      .catch((error) => {
        console.warn("Tendances temporairement indisponibles :", error);
        setTrendsError(true);
      });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-kelo-border bg-white">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
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
        ))}

        {loadingPinned && (
          <div className="border-b border-kelo-border px-3 py-4 text-center text-xs text-kelo-muted">
            Chargement des éléments épinglés...
          </div>
        )}

        {!loadingPinned && pinnedItems.map((item) => (
          <Link
            key={`${item.type}-${item.uri}`}
            href={getPinnedItemHref(item)}
            className="flex items-center gap-3 border-b border-kelo-border px-3 py-3 transition-colors hover:bg-kelo-background"
          >
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={`Image de ${getPinnedItemName(item)}`}
                className="h-9 w-9 flex-shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-kelo-gradient text-xs font-bold text-white">
                {getPinnedItemInitial(item)}
              </div>
            )}

            <div className="min-w-0 flex-grow">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-kelo-text">
                  {getPinnedItemName(item)}
                </p>
                {item.type === "list" ? (
                  <List className="h-3.5 w-3.5 flex-shrink-0 text-kelo-muted" />
                ) : (
                  <Newspaper className="h-3.5 w-3.5 flex-shrink-0 text-kelo-muted" />
                )}
              </div>
              <p className="truncate text-xs text-kelo-muted">
                {getPinnedItemSubtitle(item)}
              </p>
            </div>
          </Link>
        ))}

        {!loadingPinned && pinnedItems.length === 0 && (
          <div className="border-b border-kelo-border px-4 py-4 text-center">
            <p className="text-xs font-semibold text-kelo-text">Aucun fil épinglé</p>
            <p className="mt-1 text-xs text-kelo-muted">
              Vos fils et listes épinglés réapparaîtront automatiquement dès que votre PDS sera joignable.
            </p>
          </div>
        )}

        <Link
          href="/feeds"
          className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-kelo-background">
            <Plus className="h-4 w-4" />
          </div>
          <span className="truncate">Plus de fils d&apos;actu</span>
        </Link>
      </div>

      {!trendsError && trends.length > 0 && (
        <div className="rounded-2xl border border-kelo-border bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-kelo-text">Tendances</h3>
          <div className="flex flex-col gap-2.5">
            {trends.map((trend, index) => (
              <Link
                key={`${trend.topic}-${index}`}
                href={`/search?q=${encodeURIComponent(trend.displayName || trend.topic)}`}
                className="flex items-center gap-2 text-sm text-kelo-text transition-colors hover:text-kelo-primary"
              >
                <span className="flex-shrink-0 text-kelo-muted">{index + 1}.</span>
                <span className="truncate">{trend.displayName || trend.topic}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
