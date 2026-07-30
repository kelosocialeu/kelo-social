export interface FacetSegment {
  text: string;
  type: "mention" | "link" | "tag" | "text";
  href?: string;
}

/**
 * Découpe le texte d'une publication selon ses "facets" AT Protocol
 * (mentions, liens, hashtags). Les facets indexent par position en octets
 * UTF-8, pas en index de chaîne JS — on passe donc par un encodage/
 * décodage explicite pour rester correct avec les emojis et accents.
 */
export function segmentPostText(text: string, facets?: any[]): FacetSegment[] {
  if (!facets || facets.length === 0) return [{ text, type: "text" }];

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(text);

  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  const segments: FacetSegment[] = [];
  let cursor = 0;

  for (const facet of sorted) {
    const { byteStart, byteEnd } = facet.index || {};
    if (typeof byteStart !== "number" || typeof byteEnd !== "number") continue;
    if (byteStart < cursor || byteStart > bytes.length || byteEnd > bytes.length) continue;

    if (byteStart > cursor) {
      segments.push({ text: decoder.decode(bytes.slice(cursor, byteStart)), type: "text" });
    }

    const segmentText = decoder.decode(bytes.slice(byteStart, byteEnd));
    const feature = facet.features?.[0];

    if (feature?.$type === "app.bsky.richtext.facet#mention") {
      segments.push({ text: segmentText, type: "mention", href: feature.did });
    } else if (feature?.$type === "app.bsky.richtext.facet#link") {
      segments.push({ text: segmentText, type: "link", href: feature.uri });
    } else if (feature?.$type === "app.bsky.richtext.facet#tag") {
      segments.push({ text: segmentText, type: "tag", href: feature.tag });
    } else {
      segments.push({ text: segmentText, type: "text" });
    }

    cursor = byteEnd;
  }

  if (cursor < bytes.length) {
    segments.push({ text: decoder.decode(bytes.slice(cursor)), type: "text" });
  }

  return segments;
}
