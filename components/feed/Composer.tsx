"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/feed/Avatar";
import { searchNetworkActors } from "@/lib/atproto/search";

interface ComposerProps {
  handle: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function Composer({ handle, value, onChange, onSubmit, loading, placeholder }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);

  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 2) {
      setMentionResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const actors = await searchNetworkActors(mentionQuery, 5);
        setMentionResults(actors);
      } catch {
        setMentionResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [mentionQuery]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    const beforeCursor = newValue.slice(0, cursorPos);
    const match = beforeCursor.match(/@([a-zA-Z0-9._-]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (actorHandle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const before = value.slice(0, cursorPos).replace(/@([a-zA-Z0-9._-]*)$/, `@${actorHandle} `);
    const after = value.slice(cursorPos);
    onChange(before + after);
    setMentionQuery(null);
    setMentionResults([]);
    textarea.focus();
  };

  return (
    <form onSubmit={onSubmit} className="relative border-b border-kelo-border bg-kelo-background/50 p-4">
      <div className="flex gap-3">
        <Avatar fallback={handle ? handle[0].toUpperCase() : "K"} gradient />
        <div className="w-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder || "Diffusez sur tout l'écosystème PDS... (@ pour mentionner)"}
            rows={3}
            className="w-full resize-none bg-transparent text-base text-kelo-text placeholder-kelo-muted focus:outline-none"
          />

          {mentionResults.length > 0 && (
            <div className="mb-2 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
              {mentionResults.map((actor: any) => (
                <button
                  key={actor.did}
                  type="button"
                  onClick={() => insertMention(actor.handle)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-kelo-background"
                >
                  <Avatar src={actor.avatar} fallback={actor.handle[0].toUpperCase()} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-kelo-text">{actor.displayName || actor.handle}</p>
                    <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end border-t border-kelo-border/60 pt-2">
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
