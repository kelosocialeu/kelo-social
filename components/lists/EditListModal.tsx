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
  ManagedList,
  updateList,
} from "@/lib/atproto/lists";

interface EditListModalProps {
  open: boolean;
  list: ManagedList | null;
  onClose: () => void;
  onUpdated?: (list: ManagedList) => void;
}

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_IMAGE_SIZE = 1_000_000;

export default function EditListModal({
  open,
  list,
  onClose,
  onUpdated,
}: EditListModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    null
  );
  const [removeCurrentAvatar, setRemoveCurrentAvatar] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !list) {
      return;
    }

    setName(list.name || "");
    setDescription(list.description || "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveCurrentAvatar(false);
    setError(null);
  }, [open, list]);

  useEffect(() => {
    if (!open) {
      return;
    }

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

  const resetTemporaryImage = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);
    setAvatarPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }

    resetTemporaryImage();
    setError(null);
    onClose();
  };

  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Le fichier sélectionné doit être une image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        "L’image est trop lourde. Utilisez une image de moins de 1 Mo."
      );
      event.target.value = "";
      return;
    }

    resetTemporaryImage();

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveCurrentAvatar(false);
  };

  const handleRemoveAvatar = () => {
    resetTemporaryImage();
    setRemoveCurrentAvatar(true);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!list) {
      return;
    }

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      setError("Le nom de la liste est obligatoire.");
      return;
    }

    if (cleanName.length > MAX_NAME_LENGTH) {
      setError(
        `Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères.`
      );
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
      await updateList({
        uri: list.uri,
        name: cleanName,
        description: cleanDescription || undefined,
        avatarFile,
        currentAvatar: removeCurrentAvatar
          ? undefined
          : list.avatar,
      });

      onUpdated?.({
        ...list,
        name: cleanName,
        description: cleanDescription || undefined,
        avatar: removeCurrentAvatar
          ? undefined
          : avatarPreview || list.avatar,
      });

      resetTemporaryImage();
      onClose();
    } catch (error) {
      console.error(
        "Erreur lors de la modification de la liste :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier cette liste."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !list) {
    return null;
  }

  const displayedAvatar = removeCurrentAvatar
    ? null
    : avatarPreview || list.avatar || null;

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <div
      role="presentation"
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[1px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-list-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-kelo-border bg-white shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-kelo-border bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-full px-2 py-2 text-sm font-semibold text-kelo-primary transition hover:bg-kelo-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>

            <h2
              id="edit-list-title"
              className="truncate text-base font-extrabold text-kelo-text sm:text-lg"
            >
              Modifier la liste
            </h2>

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full px-2 py-2 text-sm font-bold text-kelo-primary transition hover:bg-kelo-background disabled:cursor-not-allowed disabled:text-kelo-muted disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </header>

          <div className="space-y-5 px-4 py-5 sm:px-5">
            <section>
              <p className="mb-3 text-sm font-semibold text-kelo-text">
                Avatar de la liste
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="group relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-kelo-border bg-kelo-gradient shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Changer l’image de la liste"
                >
                  {displayedAvatar ? (
                    <img
                      src={displayedAvatar}
                      alt="Aperçu de l’image de la liste"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-white" />
                  )}

                  <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-kelo-primary text-white shadow">
                    <Camera className="h-4 w-4" />
                  </span>
                </button>

                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Changer l’image
                  </button>

                  <p className="mt-2 text-xs leading-relaxed text-kelo-muted">
                    JPG, PNG, GIF ou WebP. Taille maximale : 1 Mo.
                  </p>

                  {displayedAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={submitting}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-kelo-danger transition hover:opacity-80 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Retirer l’image
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="edit-list-name"
                  className="text-sm font-semibold text-kelo-text"
                >
                  Nom de la liste
                </label>

                <span
                  className={`text-xs ${
                    name.length > MAX_NAME_LENGTH
                      ? "text-kelo-danger"
                      : "text-kelo-muted"
                  }`}
                >
                  {name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>

              <input
                id="edit-list-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                disabled={submitting}
                maxLength={MAX_NAME_LENGTH}
                className="w-full rounded-2xl border border-transparent bg-kelo-background px-4 py-3 text-sm text-kelo-text outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20 disabled:opacity-60"
              />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="edit-list-description"
                  className="text-sm font-semibold text-kelo-text"
                >
                  Description
                  <span className="ml-1 font-normal text-kelo-muted">
                    (facultatif)
                  </span>
                </label>

                <span
                  className={`text-xs ${
                    description.length > MAX_DESCRIPTION_LENGTH
                      ? "text-kelo-danger"
                      : "text-kelo-muted"
                  }`}
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>

              <textarea
                id="edit-list-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setError(null);
                }}
                disabled={submitting}
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={4}
                className="w-full resize-none rounded-2xl border border-transparent bg-kelo-background px-4 py-3 text-sm leading-relaxed text-kelo-text outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20 disabled:opacity-60"
              />
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-kelo-danger/20 bg-kelo-danger/5 px-4 py-3 text-sm text-kelo-danger"
              >
                {error}
              </div>
            )}

            {submitting && (
              <div className="flex items-center justify-center gap-2 py-1 text-sm text-kelo-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement sur votre PDS...
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
