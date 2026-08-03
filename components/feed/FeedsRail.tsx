"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Users, Plus } from "lucide-react";
import { KELO_CURATED_LISTS } from "@/lib/atproto/lists";
import { getTrendingTopics, TrendingTopic } from "@/lib/atproto/trends";

const QUICK_LINKS = [
  { href: "/feed", label: "Découvrir", icon: Compass },
  { href: "/feed", label: "Suivis", icon: Users },
];

/**
 * Colonne de droite façon bsky.app : accès rapides (Découvrir/Suivis),
 * les listes officielles Kelo, un lien vers tous les fils d'actu, et les
 * tendances du réseau fédéré.
 */
export default function FeedsRail() {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [trendsError, setTrendsError] = useState(false);

  useEffect(() => {
    getTrendingTopics(5)
      .then(setTrends)
      .catch(() => setTrendsError(true));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-kelo-border bg-white">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 border-b border-kelo-border p-3 text-sm font-semibold text-kelo-text transition-colors hover:bg-kelo-background"
          >
            <Icon className="h-4 w-4 text-kelo-primary" />
            {label}
          </Link>
        ))}

        {KELO_CURATED_LISTS.map((list) => (
          <Link
            key={list.uri}
            href={`/feeds/list?uri=${encodeURIComponent(list.uri)}`}
            className="flex items-center gap-3 border-b border-kelo-border p-3 text-sm font-semibold text-kelo-text transition-colors hover:bg-kelo-background"
          >
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-kelo-gradient text-[10px] font-bold text-white">
              K
            </span>
            {list.label}
          </Link>
        ))}

        <Link
          href="/feeds"
          className="flex items-center gap-3 p-3 text-sm font-semibold text-kelo-muted transition-colors hover:bg-kelo-background"
        >
          <Plus className="h-4 w-4" />
          Plus de fils d'actu
        </Link>
      </div>

      {!trendsError && trends.length > 0 && (
        <div className="rounded-2xl border border-kelo-border bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-kelo-text">Tendances</h3>
          <div className="flex flex-col gap-2.5">
            {trends.map((trend, i) => (
              <Link
                key={`${trend.topic}-${i}`}
                href={`/search?q=${encodeURIComponent(trend.displayName || trend.topic)}`}
                className="flex items-center gap-2 text-sm text-kelo-text transition-colors hover:text-kelo-primary"
              >
                <span className="flex-shrink-0 text-kelo-muted">{i + 1}.</span>
                <span className="truncate">{trend.displayName || trend.topic}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
