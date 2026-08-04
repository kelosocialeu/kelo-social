"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import {
  createStarterPackWithList,
  StarterPackView,
} from "@/lib/atproto/starter-packs";

interface CreateStarterPackModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (starterPack: StarterPackView) => void;
}

const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_IMAGE_SIZE = 1_000_000;

export default function CreateStarterPackModal({
  open,
  onClose,
  onCreated,
}: CreateStarterPackModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [feedUrisText, setFeedUrisText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const resetForm = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setName("");
    setDescription("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setFeedUrisText("");
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeModal = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Le fichier sélectionné doit être une image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("L’image doit peser moins de 1 Mo.");
      event.target.value = "";
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);
    setAvatarPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const parseFeedUris = (): string[] => {
    return feedUrisText
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      setError("Le nom du kit est obligatoire.");
      return;
    }

    if (cleanName.length > MAX_NAME_LENGTH) {
      setError(`Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères.`);
      return;
    }

    if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `La description ne peut pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createStarterPackWithList({
        name: cleanName,
        description: cleanDescription || undefined,
        avatarFile,
        feedUris: parseFeedUris(),
      });

      onCreated?.({
        uri: created.starterPackUri,
        cid: created.starterPackCid,
        record: {
          name: cleanName,
          description: cleanDescription || undefined,
          list: created.listUri,
          feeds: parseFeedUris().map((uri) => ({ uri })),
          createdAt: new Date().toISOString(),
        },
        list: {
          uri: created.listUri,
          name: cleanName,
          description: cleanDescription || undefined,
          avatar: avatarPreview || undefined,
          listItemCount: 0,
        },
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Création du kit impossible :", error);

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de créer ce kit de démarrage."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[1px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-starter-pack-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-kelo-border bg-white shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-kelo-border bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="rounded-full px-2 py-2 text-sm font-semibold text-kelo-primary hover:bg-kelo-background disabled:opacity-50"
            >
              Annuler
            </button>

            <h2
              id="create-starter-pack-title"
              className="truncate text-base font-extrabold text-kelo-text sm:text-lg"
            >
              Créer un kit de démarrage
            </h2>

            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="rounded-full px-2 py-2 text-sm font-bold text-kelo-primary hover:bg-kelo-background disabled:text-kelo-muted disabled:opacity-50"
            >
              {submitting ? "Création..." : "Enregistrer"}
            </button>
          </header>

          <div className="space-y-5 px-4 py-5 sm:px-5">
            <section>
              <p className="mb-3 text-sm font-semibold text-kelo-text">
                Image du kit
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-kelo-border bg-kelo-gradient"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Aperçu"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-white" />
                  )}

                  <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-kelo-primary text-white">
                    <Camera className="h-4 w-4" />
                  </span>
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text"
                  >
                    Importer une image
                  </button>

                  <p className="mt-2 text-xs text-kelo-muted">
                    L’image sera enregistrée sur la liste liée au kit.
                  </p>

                  {avatarFile && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-kelo-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                      Retirer
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </section>

            <section>
              <label
                htmlFor="starter-pack-name"
                className="mb-2 block text-sm font-semibold text-kelo-text"
              >
                Nom du kit
              </label>

              <input
                id="starter-pack-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder="ex. Découvrir Kelo Social"
                className="w-full rounded-2xl bg-kelo-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-kelo-primary"
              />

              <p className="mt-1 text-right text-xs text-kelo-muted">
                {name.length}/{MAX_NAME_LENGTH}
              </p>
            </section>

            <section>
              <label
                htmlFor="starter-pack-description"
                className="mb-2 block text-sm font-semibold text-kelo-text"
              >
                Description
                <span className="ml-1 font-normal text-kelo-muted">
                  (facultatif)
                </span>
              </label>

              <textarea
                id="starter-pack-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={4}
                placeholder="Expliquez ce que contient ce kit."
                className="w-full resize-none rounded-2xl bg-kelo-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-kelo-primary"
              />

              <p className="mt-1 text-right text-xs text-kelo-muted">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </section>

            <section>
              <label
                htmlFor="starter-pack-feeds"
                className="mb-2 block text-sm font-semibold text-kelo-text"
              >
                Fils d’actu associés
                <span className="ml-1 font-normal text-kelo-muted">
                  (facultatif, maximum 3)
                </span>
              </label>

              <textarea
                id="starter-pack-feeds"
                value={feedUrisText}
                onChange={(event) =>
                  setFeedUrisText(event.target.value)
                }
                rows={3}
                placeholder={"Une URI AT par ligne\nat://did:plc:.../app.bsky.feed.generator/..."}
                className="w-full resize-none rounded-2xl bg-kelo-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-kelo-primary"
              />
            </section>

            {error && (
              <div className="rounded-2xl border border-kelo-danger/20 bg-kelo-danger/5 px-4 py-3 text-sm text-kelo-danger">
                {error}
              </div>
            )}

            {submitting && (
              <div className="flex items-center justify-center gap-2 text-sm text-kelo-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Création du kit et de sa liste...
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
