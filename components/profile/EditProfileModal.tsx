"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PROFILE_BIO_LIMIT,
  PROFILE_DISPLAY_NAME_LIMIT,
  updateOwnProfile,
} from "@/lib/atproto/profile-update";

interface EditProfileModalProps {
  open: boolean;
  profile: any;
  onClose: () => void;
  onSaved: (profile: any) => void;
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

export default function EditProfileModal({
  open,
  profile,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile?.displayName || "");
    setDescription(profile?.description || "");
    setAvatarFile(null);
    setBannerFile(null);
    setError("");
  }, [open, profile]);

  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : profile?.avatar || ""),
    [avatarFile, profile?.avatar]
  );

  const bannerPreview = useMemo(
    () => (bannerFile ? URL.createObjectURL(bannerFile) : profile?.banner || ""),
    [bannerFile, profile?.banner]
  );

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarFile, avatarPreview]);

  useEffect(() => {
    return () => {
      if (bannerFile && bannerPreview.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerFile, bannerPreview]);

  if (!open) return null;

  const displayCount = countCharacters(displayName);
  const bioCount = countCharacters(description);
  const invalid =
    displayCount > PROFILE_DISPLAY_NAME_LIMIT ||
    bioCount > PROFILE_BIO_LIMIT;

  async function handleSave() {
    if (saving || invalid) return;
    setSaving(true);
    setError("");

    try {
      const updated = await updateOwnProfile({
        displayName,
        description,
        avatar: avatarFile,
        banner: bannerFile,
      });

      onSaved({
        ...profile,
        ...updated,
        displayName: updated?.displayName ?? displayName.trim(),
        description: updated?.description ?? description.trim(),
        avatar: updated?.avatar || avatarPreview || profile?.avatar,
        banner: updated?.banner || bannerPreview || profile?.banner,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de modifier le profil."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !saving) onClose();
      }}
    >
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-kelo-border bg-white/95 px-5 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-3 py-2 text-sm font-bold text-kelo-muted transition hover:bg-kelo-background"
          >
            Annuler
          </button>
          <h2 className="text-lg font-extrabold">Modifier le profil</h2>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || invalid}
            className="rounded-full bg-kelo-primary px-4 py-2 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold">Photo de couverture</label>
            <label className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-kelo-gradient">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Aperçu de la couverture" className="h-full w-full object-cover" />
              ) : (
                <span className="font-bold text-white">Ajouter une couverture</span>
              )}
              <span className="absolute rounded-full bg-black/55 px-3 py-2 text-xs font-bold text-white">
                Changer la photo
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => setBannerFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">Photo de profil</label>
            <label className="relative inline-flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-kelo-gradient shadow-md">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Aperçu du profil" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-white">
                  {(displayName || profile?.handle || "K").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-2 text-center text-[11px] font-bold text-white">
                Modifier
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="profile-display-name" className="text-sm font-bold">
                Nom d’affichage
              </label>
              <span className={`text-xs ${displayCount > PROFILE_DISPLAY_NAME_LIMIT ? "text-kelo-danger" : "text-kelo-muted"}`}>
                {displayCount}/{PROFILE_DISPLAY_NAME_LIMIT}
              </span>
            </div>
            <input
              id="profile-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-2xl border border-kelo-border px-4 py-3 outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/15"
              placeholder="Votre nom"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="profile-description" className="text-sm font-bold">
                Bio
              </label>
              <span className={`text-xs ${bioCount > PROFILE_BIO_LIMIT ? "text-kelo-danger" : "text-kelo-muted"}`}>
                {bioCount}/{PROFILE_BIO_LIMIT}
              </span>
            </div>
            <textarea
              id="profile-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="w-full resize-none rounded-2xl border border-kelo-border px-4 py-3 outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/15"
              placeholder="Parlez de vous..."
            />
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-kelo-danger">
              {error}
            </p>
          )}

          <p className="text-xs leading-relaxed text-kelo-muted">
            Les modifications sont enregistrées directement sur votre profil AT Protocol et restent donc liées à votre compte, quel que soit l’appareil utilisé.
          </p>
        </div>
      </section>
    </div>
  );
}
