"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Avatar from "@/components/feed/Avatar";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";

import {
  searchNetworkActors,
} from "@/lib/atproto/search";
import {
  POST_CHARACTER_LIMIT,
} from "@/lib/atproto/posts";

import {
  useIdentityVerification,
} from "@/hooks/useIdentityVerification";

interface ComposerProps {
  handle: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (
    event: React.FormEvent
  ) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function Composer({
  handle,
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder,
}: ComposerProps) {
  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const [mentionQuery, setMentionQuery] =
    useState<string | null>(null);

  const [mentionResults, setMentionResults] =
    useState<any[]>([]);

  const characterCount = Array.from(value).length;
  const overLimit = characterCount > POST_CHARACTER_LIMIT;

  const {
    checked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  useEffect(() => {
    if (
      mentionQuery === null ||
      mentionQuery.length < 2
    ) {
      setMentionResults([]);
      return;
    }

    const timeout =
      window.setTimeout(async () => {
        try {
          const actors =
            await searchNetworkActors(
              mentionQuery,
              5
            );

          setMentionResults(actors);
        } catch {
          setMentionResults([]);
        }
      }, 300);

    return () =>
      window.clearTimeout(timeout);
  }, [mentionQuery]);

  const handleTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    if (!requireVerification()) {
      return;
    }

    const newValue =
      event.target.value;

    const cursorPosition =
      event.target.selectionStart;

    onChange(newValue);

    const beforeCursor =
      newValue.slice(
        0,
        cursorPosition
      );

    const match =
      beforeCursor.match(
        /@([a-zA-Z0-9._-]*)$/
      );

    setMentionQuery(
      match ? match[1] : null
    );
  };

  const insertMention = (
    actorHandle: string
  ) => {
    if (!requireVerification()) {
      return;
    }

    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const cursorPosition =
      textarea.selectionStart;

    const before = value
      .slice(0, cursorPosition)
      .replace(
        /@([a-zA-Z0-9._-]*)$/,
        `@${actorHandle} `
      );

    const after =
      value.slice(cursorPosition);

    onChange(before + after);
    setMentionQuery(null);
    setMentionResults([]);

    textarea.focus();
  };

  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!requireVerification() || overLimit) {
      return;
    }

    onSubmit(event);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="relative border-b border-kelo-border bg-kelo-background/50 p-4"
      >
        <div className="flex gap-3">
          <Avatar
            fallback={
              handle
                ? handle[0].toUpperCase()
                : "K"
            }
            gradient
          />

          <div className="w-full">
            {!verified && checked && (
              <button
                type="button"
                onClick={requireVerification}
                className="mb-3 w-full rounded-2xl border border-kelo-border bg-white p-3 text-left text-sm transition hover:border-kelo-primary"
              >
                <span className="font-bold text-kelo-text">
                  Vérification requise
                </span>

                <span className="mt-1 block text-xs text-kelo-muted">
                  Vous devez être vérifié pour publier.
                </span>
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextChange}
              onFocus={() => {
                if (!verified) {
                  requireVerification();
                }
              }}
              readOnly={!verified}
              placeholder={
                verified
                  ? placeholder ||
                    "Diffusez sur tout l'écosystème PDS... (@ pour mentionner)"
                  : "Vérifiez votre compte pour publier..."
              }
              rows={3}
              className="w-full resize-none bg-transparent text-base text-kelo-text placeholder-kelo-muted focus:outline-none read-only:cursor-not-allowed read-only:opacity-60"
            />

            {mentionResults.length > 0 && (
              <div className="mb-2 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
                {mentionResults.map(
                  (actor: any) => (
                    <button
                      key={actor.did}
                      type="button"
                      onClick={() =>
                        insertMention(
                          actor.handle
                        )
                      }
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-kelo-background"
                    >
                      <Avatar
                        src={actor.avatar}
                        fallback={
                          actor.handle[0].toUpperCase()
                        }
                        size="sm"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-kelo-text">
                          {actor.displayName ||
                            actor.handle}
                        </p>

                        <p className="truncate text-xs text-kelo-muted">
                          @{actor.handle}
                        </p>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-kelo-border/60 pt-2">
              <span
                className={`text-xs font-bold ${
                  overLimit
                    ? "text-kelo-danger"
                    : "text-kelo-muted"
                }`}
              >
                {characterCount}/{POST_CHARACTER_LIMIT}
              </span>

              <button
                type="submit"
                disabled={
                  loading ||
                  !value.trim() ||
                  !verified ||
                  overLimit
                }
                className="rounded-full bg-kelo-gradient px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Publication..."
                  : "Diffuser"}
              </button>
            </div>
          </div>
        </div>
      </form>

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </>
  );
}
