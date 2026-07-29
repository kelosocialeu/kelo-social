"use client";

import Avatar from "@/components/feed/Avatar";

interface ComposerProps {
  handle: string;
  pdsService: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function Composer({
  handle,
  pdsService,
  value,
  onChange,
  onSubmit,
  loading,
  placeholder,
}: ComposerProps) {
  return (
    <form onSubmit={onSubmit} className="border-b border-kelo-border bg-kelo-background/50 p-4">
      <div className="flex gap-3">
        <Avatar fallback={handle ? handle[0].toUpperCase() : "K"} gradient />
        <div className="w-full">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Diffusez sur tout l'écosystème PDS..."}
            rows={3}
            className="w-full resize-none bg-transparent text-base text-kelo-text placeholder-kelo-muted focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between border-t border-kelo-border/60 pt-2">
            <span className="max-w-[200px] truncate text-xs text-kelo-muted">PDS : {pdsService}</span>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="rounded-full bg-kelo-gradient px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            >
              {loading ? "Publication..." : "Diffuser"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
