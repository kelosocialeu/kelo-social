"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FileImage,
  Film,
  Image as ImageIcon,
  Laugh,
  X,
} from "lucide-react";

import CurrentUserAvatar from "@/components/feed/CurrentUserAvatar";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import {
  createPost,
  MAX_POST_IMAGES,
  POST_CHARACTER_LIMIT,
} from "@/lib/atproto/posts";

export const OPEN_GLOBAL_COMPOSER_EVENT =
  "kelo-open-composer";

const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😎", "🤔", "😭", "😡",
  "👍", "👏", "🙏", "💪", "❤️", "🔥", "✨", "🎉",
  "🌍", "📸", "🎥", "🎵", "✅", "🚀", "💬", "💜",
];

function characterCount(value: string): number {
  return Array.from(value).length;
}

function revokePreviews(urls: string[]) {
  urls.forEach((url) => URL.revokeObjectURL(url));
}

export default function GlobalPostComposer() {
  const {
    checked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  const count = useMemo(() => characterCount(text), [text]);
  const overLimit = count > POST_CHARACTER_LIMIT;
  const hasVideo = files.some((file) =>
    file.type.startsWith("video/")
  );

  useEffect(() => {
    const showComposer = () => {
      if (!requireVerification()) return;
      setOpen(true);
      window.setTimeout(() => textareaRef.current?.focus(), 50);
    };

    window.addEventListener(
      OPEN_GLOBAL_COMPOSER_EVENT,
      showComposer
    );

    return () => {
      window.removeEventListener(
        OPEN_GLOBAL_COMPOSER_EVENT,
        showComposer
      );
    };
  }, [requireVerification]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => revokePreviews(previews);
  }, [previews]);

  function resetComposer() {
    revokePreviews(previews);
    setText("");
    setFiles([]);
    setPreviews([]);
    setEmojiOpen(false);
    setError("");
  }

  function closeComposer() {
    if (loading) return;
    setOpen(false);
    resetComposer();
  }

  function applyFiles(selected: File[]) {
    setError("");

    const selectedVideos = selected.filter((file) =>
      file.type.startsWith("video/")
    );
    const selectedImages = selected.filter((file) =>
      file.type.startsWith("image/")
    );

    if (selectedVideos.length > 0) {
      if (selectedVideos.length > 1) {
        setError("Une seule vidéo est autorisée par publication.");
        return;
      }

      revokePreviews(previews);
      setFiles([selectedVideos[0]]);
      setPreviews([URL.createObjectURL(selectedVideos[0])]);
      return;
    }

    if (hasVideo) {
      setError("Retirez la vidéo avant d’ajouter une image ou un GIF.");
      return;
    }

    const nextFiles = [...files, ...selectedImages].slice(
      0,
      MAX_POST_IMAGES
    );

    if (files.length + selectedImages.length > MAX_POST_IMAGES) {
      setError(`${MAX_POST_IMAGES} images ou GIF maximum par publication.`);
    }

    revokePreviews(previews);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  }

  function removeFile(index: number) {
    const nextFiles = files.filter((_, itemIndex) => itemIndex !== index);
    revokePreviews(previews);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${emoji}${text.slice(end)}`;

    if (characterCount(nextText) > POST_CHARACTER_LIMIT) {
      return;
    }

    setText(nextText);
    setEmojiOpen(false);

    window.setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(
        start + emoji.length,
        start + emoji.length
      );
    }, 0);
  }

  async function publish() {
    if (!requireVerification()) return;
    if (overLimit || (!text.trim() && files.length === 0)) return;

    setLoading(true);
    setError("");

    try {
      const post = await createPost(text, { files });
      window.dispatchEvent(
        new CustomEvent("kelo-post-created", {
          detail: post,
        })
      );
      setOpen(false);
      resetComposer();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Publication impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
        onClick={closeComposer}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Écrire une publication"
        className="fixed inset-x-0 bottom-0 z-[90] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:left-1/2 md:top-1/2 md:bottom-auto md:w-[min(680px,calc(100%-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-kelo-border bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={closeComposer}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-kelo-background"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="font-extrabold text-kelo-text">
            Écrire un post
          </h2>

          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="flex gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <CurrentUserAvatar />

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <textarea
                ref={textareaRef}
                value={text}
                maxLength={POST_CHARACTER_LIMIT}
                onChange={(event) => setText(event.target.value)}
                placeholder="Quoi de neuf ?"
                rows={6}
                className="min-h-36 min-w-0 flex-1 resize-none bg-transparent text-lg leading-relaxed text-kelo-text placeholder-kelo-muted focus:outline-none"
              />

              <span
                className={`mt-1 flex-shrink-0 text-sm font-bold ${
                  overLimit
                    ? "text-kelo-danger"
                    : count >= POST_CHARACTER_LIMIT - 30
                      ? "text-amber-600"
                      : "text-kelo-muted"
                }`}
              >
                {count}/{POST_CHARACTER_LIMIT}
              </span>
            </div>

            {previews.length > 0 && (
              <div
                className={`mt-3 grid gap-2 overflow-hidden rounded-2xl ${
                  previews.length > 1 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {previews.map((preview, index) => (
                  <div
                    key={preview}
                    className="relative overflow-hidden rounded-2xl bg-black"
                  >
                    {files[index]?.type.startsWith("video/") ? (
                      <video
                        src={preview}
                        controls
                        playsInline
                        className="max-h-[55dvh] w-full object-contain"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Aperçu du média"
                        className="max-h-80 w-full object-cover"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                      aria-label="Retirer le média"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-kelo-danger">
                {error}
              </p>
            )}

            <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-kelo-border pt-3">
              <div className="flex items-center gap-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    applyFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(event) => {
                    applyFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />
                <input
                  ref={gifInputRef}
                  type="file"
                  accept="image/gif"
                  className="hidden"
                  onChange={(event) => {
                    applyFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-kelo-primary hover:bg-kelo-background"
                  title="Ajouter une photo"
                  aria-label="Ajouter une photo"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-kelo-primary hover:bg-kelo-background"
                  title="Ajouter une vidéo"
                  aria-label="Ajouter une vidéo"
                >
                  <Film className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => gifInputRef.current?.click()}
                  className="flex h-10 items-center gap-1 rounded-full px-2 text-xs font-bold text-kelo-primary hover:bg-kelo-background"
                  title="Ajouter un GIF"
                  aria-label="Ajouter un GIF"
                >
                  <FileImage className="h-5 w-5" />
                  GIF
                </button>

                <button
                  type="button"
                  onClick={() => setEmojiOpen((value) => !value)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-kelo-primary hover:bg-kelo-background"
                  title="Ajouter un emoji"
                  aria-label="Ajouter un emoji"
                >
                  <Laugh className="h-5 w-5" />
                </button>

                {emojiOpen && (
                  <div className="absolute bottom-14 left-0 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-kelo-border bg-white p-3 shadow-2xl">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xl hover:bg-kelo-background"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={publish}
                disabled={
                  loading ||
                  overLimit ||
                  (!text.trim() && files.length === 0) ||
                  !verified ||
                  !checked
                }
                className="ml-auto rounded-full bg-kelo-gradient px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Publication..." : "Publier"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </>
  );
}
