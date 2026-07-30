"use client";

import { Link2, Facebook, Instagram, Twitter, Mail } from "lucide-react";

interface ShareMenuProps {
  postUrl: string;
  postText: string;
  onCopyLink: () => void;
  onClose: () => void;
}

/**
 * Menu de partage : copier le lien, partager sur Facebook/X, envoyer par
 * email. Instagram n'a pas d'API web de partage direct — on copie le lien
 * et on guide l'utilisateur, plutôt que d'ouvrir un lien cassé.
 */
export default function ShareMenu({ postUrl, postText, onCopyLink, onClose }: ShareMenuProps) {
  const openAndClose = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
      <button
        onClick={() => {
          onCopyLink();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
      >
        <Link2 className="h-4 w-4" />
        Copier le lien
      </button>

      <button
        onClick={() =>
          openAndClose(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`)
        }
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
      >
        <Facebook className="h-4 w-4" />
        Partager sur Facebook
      </button>

      <button
        onClick={() =>
          openAndClose(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postText)}`
          )
        }
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
      >
        <Twitter className="h-4 w-4" />
        Partager sur X
      </button>

      <button
        onClick={() => {
          onCopyLink();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
      >
        <Instagram className="h-4 w-4" />
        <span className="text-left">
          Instagram
          <span className="block text-xs text-kelo-muted">Lien copié — collez-le dans votre story</span>
        </span>
      </button>

      <button
        onClick={() =>
          openAndClose(
            `mailto:?subject=${encodeURIComponent("Publication sur Kelo Social")}&body=${encodeURIComponent(
              postText + "\n\n" + postUrl
            )}`
          )
        }
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
      >
        <Mail className="h-4 w-4" />
        Envoyer par email
      </button>
    </div>
  );
}
