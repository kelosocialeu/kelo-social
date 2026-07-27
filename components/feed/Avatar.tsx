interface AvatarProps {
  src?: string;
  fallback: string;
  size?: "sm" | "md";
  gradient?: boolean;
}

/**
 * Affiche la vraie photo de profil AT Protocol quand elle existe
 * (post.author.avatar), sinon un cercle avec l'initiale du handle.
 */
export default function Avatar({ src, fallback, size = "md", gradient = false }: AvatarProps) {
  const dimension = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  if (src) {
    return (
      <img
        src={src}
        alt={fallback}
        className={`${dimension} flex-shrink-0 rounded-full object-cover shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${dimension} flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${
        gradient ? "bg-kelo-gradient" : "bg-gradient-to-tr from-gray-700 to-gray-900"
      }`}
    >
      {fallback}
    </div>
  );
}
