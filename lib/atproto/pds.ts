import { PdsProvider } from "@/types/auth";

export const PDS_PROVIDERS: PdsProvider[] = [
  { id: "kelo", label: "Kelo Social (pds.kelosocial.eu)", url: "https://pds.kelosocial.eu" },
  { id: "wsocial", label: "WSocial (pds.wsocial.eu)", url: "https://pds.wsocial.eu" },
  { id: "eurosky", label: "Eurosky / Mu Social", url: "https://eurosky.social" },
  { id: "bsky", label: "Bluesky (bsky.social)", url: "https://bsky.social" },
];

export const DEFAULT_PDS_URL = PDS_PROVIDERS[0].url;

/**
 * Normalise une URL de PDS saisie librement par l'utilisateur
 * (ajoute https:// si absent).
 */
export function normalizePdsUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_PDS_URL;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}
