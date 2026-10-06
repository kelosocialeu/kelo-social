export interface MentionActor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

const HANDLE_QUERY_PATTERN = /(^|\s)@([a-z0-9][a-z0-9.-]{0,251})$/i;

export function getActiveMention(text: string, caret: number) {
  const beforeCaret = text.slice(0, caret);
  const match = beforeCaret.match(HANDLE_QUERY_PATTERN);
  if (!match) return null;
  return {
    query: match[2],
    start: beforeCaret.length - match[2].length - 1,
    end: caret,
  };
}

export async function searchMentionActors(query: string, signal?: AbortSignal): Promise<MentionActor[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead");
  url.searchParams.set("q", normalized);
  url.searchParams.set("limit", "8");
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`Mention search failed: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.actors) ? data.actors : [];
}

export function insertMention(
  text: string,
  start: number,
  end: number,
  handle: string,
) {
  const replacement = `@${handle} `;
  return {
    text: `${text.slice(0, start)}${replacement}${text.slice(end)}`,
    caret: start + replacement.length,
  };
}
