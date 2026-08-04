/**
 * Utilitaires liés aux adresses des PDS AT Protocol.
 *
 * La connexion ne repose plus sur une liste fixe de fournisseurs :
 * le PDS est découvert automatiquement à partir du handle de l'utilisateur.
 */

/**
 * Normalise et vérifie une adresse de PDS.
 */
export function normalizePdsUrl(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("L’adresse du PDS est vide.");
  }

  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("L’adresse du PDS est invalide.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Le PDS doit utiliser une connexion HTTPS.");
  }

  return url.origin;
}
