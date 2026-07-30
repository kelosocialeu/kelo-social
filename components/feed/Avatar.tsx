interface AvatarProps {
  src?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  gradient?: boolean;
}

/**
 * Affiche la vraie photo de profil AT Protocol quand elle existe
 * (post.author.avatar), sinon un cercle avec l'initiale du handle.
 *
 * Le wrapper a une taille fixe + overflow-hidden, et l'image le remplit
 * en position absolute (inset-0 + object-cover). Ce pattern évite tout
 * bug d'affichage "image coupée en deux" qui peut survenir avec une balise
 * <img> en display inline par défaut (espace de descendance, alignement
 * de ligne de base) quand elle chevauche un autre élément via une marge
 * négative — comme l'avatar qui chevauche la bannière du profil.
 */
export default function Avatar({ src, fallback, size = "md", gradient = false }: AvatarProps) {
  const dimension = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-24 w-24 text-3xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={`${dimension} relative flex-shrink-0 overflow-hidden rounded-full shadow-sm ${
        src ? "bg-kelo-background" : gradient ? "bg-kelo-gradient" : "bg-gradient-to-tr from-gray-700 to-gray-900"
      }`}
    >
      {src ? (
        <img src={src} alt={fallback} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-bold text-white">{fallback}</span>
      )}
    </div>
  );
}
