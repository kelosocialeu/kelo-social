"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FileImage,
  Film,
  Image as ImageIcon,
  Laugh,
} from "lucide-react";

import Avatar from "@/components/feed/Avatar";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import {
  OPEN_GLOBAL_COMPOSER_EVENT,
} from "@/components/feed/GlobalPostComposer";
import {
  searchNetworkActors,
} from "@/lib/atproto/search";
import {
  getActorProfile,
} from "@/lib/atproto/profile";
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

function characterCount(value: string): number {
  return Array.from(value).length;
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

  const [avatar, setAvatar] =
    useState<string | undefined>(undefined);

  const [mentionQuery, setMentionQuery] =
    useState<string | null>(null);

  const [mentionResults, setMentionResults] =
    useState<any[]>([]);

  const {
    checked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  const count = characterCount(value);
  const overLimit = count > POST_CHARACTER_LIMIT;

  useEffect(() => {
    let cancelled = false;

    if (!handle) {
      setAvatar(undefined);
      return;
    }

    getActorProfile(handle)
      .then((profile) => {
        if (!cancelled) {
          setAvatar(profile?.avatar || undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvatar(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

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

    const newValue = event.target.value;
    const cursorPosition = event.target.selectionStart;

    onChange(newValue);

    const beforeCursor = newValue.slice(0, cursorPosition);
    const match = beforeCursor.match(
      /@([a-zA-Z0-9._-]*)$/
    );

    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (
    actorHandle: string
  ) => {
    if (!requireVerification()) {
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const cursorPosition = textarea.selectionStart;

    const before = value
      .slice(0, cursorPosition)
      .replace(
        /@([a-zA-Z0-9._-]*)$/,
        `@${actorHandle} `
      );

    const after = value.slice(cursorPosition);

    onChange((before + after).slice(0, POST_CHARACTER_LIMIT));
    setMentionQuery(null);
    setMentionResults([]);
    textarea.focus();
  };

  const openGlobalComposer = () => {
    if (!requireVerification()) {
      return;
    }

    window.dispatchEvent(
      new Event(OPEN_GLOBAL_COMPOSER_EVENT)
    );
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
            src={avatar}
            fallback={
              handle
                ? handle[0].toUpperCase()
                : "K"
            }
            gradient={!avatar}
          />

          <div className="min-w-0 w-full">
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
                  Touchez le compositeur ou un outil pour vérifier votre compte.
                </span>
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              maxLength={POST_CHARACTER_LIMIT}
              onChange={handleTextChange}
              onFocus={() => {
                if (!verified) {
                  requireVerification();
                }
              }}
              aria-disabled={!verified}
              placeholder={placeholder || "Quoi de neuf ?"}
              rows={3}
              className="w-full resize-none bg-transparent text-base text-kelo-text placeholder-kelo-muted focus:outline-none"
            />

            {mentionResults.length > 0 && (
              <div className="mb-2 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
                {mentionResults.map(
                  (actor: any) => (
                    <button
                      key={actor.did}
                      type="button"
                      onClick={() =>
                        insertMention(actor.handle)
                      }
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-kelo-background"
                    >
                      <Avatar
                        src={actor.avatar}
                        fallback={actor.handle[0].toUpperCase()}
                        size="sm"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-kelo-text">
                          {actor.displayName || actor.handle}
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

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-kelo-border/60 pt-2">
              <div className="flex min-w-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={openGlobalComposer}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-primary transition hover:bg-white"
                  title="Ajouter une photo"
                  aria-label="Ajouter une photo"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={openGlobalComposer}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-primary transition hover:bg-white"
                  title="Ajouter une vidéo"
                  aria-label="Ajouter une vidéo"
                >
                  <Film className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={openGlobalComposer}
                  className="flex h-9 items-center gap-1 rounded-full px-2 text-xs font-extrabold text-kelo-primary transition hover:bg-white"
                  title="Ajouter un GIF"
                  aria-label="Ajouter un GIF"
                >
                  <FileImage className="h-5 w-5" />
                  GIF
                </button>

                <button
                  type="button"
                  onClick={openGlobalComposer}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-primary transition hover:bg-white"
                  title="Ajouter un emoji"
                  aria-label="Ajouter un emoji"
                >
                  <Laugh className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-shrink-0 items-center gap-3">
                <span
                  className={`text-sm font-bold ${
                    overLimit
                      ? "text-kelo-danger"
                      : count >= POST_CHARACTER_LIMIT - 30
                        ? "text-amber-600"
                        : "text-kelo-muted"
                  }`}
                >
                  {count}/{POST_CHARACTER_LIMIT}
                </span>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !value.trim() ||
                    !verified ||
                    overLimit
                  }
                  className="rounded-full bg-kelo-gradient px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Publication..."
                    : "Publier"}
                </button>
              </div>
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
