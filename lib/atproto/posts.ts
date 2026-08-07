import { RichText } from "@atproto/api";

import {
  getAuthenticatedAgent,
} from "@/services/auth.service";
import {
  requireIdentityVerification,
} from "@/lib/atproto/verification-guard";

export const POST_CHARACTER_LIMIT = 300;
export const MAX_POST_IMAGES = 4;
export const MAX_POST_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_POST_VIDEO_BYTES = 50 * 1024 * 1024;

export type PostContentLabel = "nudity" | "sexual" | "graphic-media";

let pendingPostContentLabel: PostContentLabel | null = null;

export function setNextPostContentLabel(label?: PostContentLabel) {
  pendingPostContentLabel = label || null;
}

function consumeNextPostContentLabel(): PostContentLabel[] {
  const label = pendingPostContentLabel;
  pendingPostContentLabel = null;
  return label ? [label] : [];
}

export interface StrongRef {
  uri: string;
  cid: string;
  $type?: "com.atproto.repo.strongRef";
  [key: string]: unknown;
}

export interface ReplyTarget extends StrongRef {
  root?: StrongRef;
}

export interface PostMediaInput {
  files?: File[];
  altText?: string;
  labels?: PostContentLabel[];
}

function validateStrongRef(
  ref: StrongRef,
  label: string
): void {
  if (!ref.uri?.startsWith("at://")) {
    throw new Error(`${label} : URI AT Protocol invalide.`);
  }

  if (!ref.cid?.trim()) {
    throw new Error(`${label} : CID manquant.`);
  }
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function validatePostText(text: string, hasMedia = false): string {
  const cleanText = text.trim();

  if (!cleanText && !hasMedia) {
    throw new Error("La publication doit contenir du texte ou un média.");
  }

  if (countCharacters(cleanText) > POST_CHARACTER_LIMIT) {
    throw new Error(`La publication ne peut pas dépasser ${POST_CHARACTER_LIMIT} caractères.`);
  }

  return cleanText;
}

function buildSelfLabels(labels?: PostContentLabel[]) {
  const values = Array.from(new Set(labels || [])).map((val) => ({ val }));

  if (values.length === 0) return undefined;

  return {
    $type: "com.atproto.label.defs#selfLabels" as const,
    values,
  };
}

async function buildRichText(text: string, agent: any, hasMedia = false) {
  const cleanText = validatePostText(text, hasMedia);
  const richText = new RichText({ text: cleanText });

  if (cleanText) await richText.detectFacets(agent);
  return richText;
}

function normalizeMimeType(value: string): string {
  return value.split(";", 1)[0].trim().toLowerCase();
}

async function buildMediaEmbed(
  agent: any,
  media?: PostMediaInput
): Promise<any | undefined> {
  const files = (media?.files || []).filter(
    (file) => file instanceof File && file.size > 0
  );

  if (files.length === 0) return undefined;

  const videos = files.filter((file) =>
    normalizeMimeType(file.type).startsWith("video/")
  );
  const images = files.filter((file) =>
    normalizeMimeType(file.type).startsWith("image/")
  );

  if (videos.length > 0 && images.length > 0) {
    throw new Error("Une publication ne peut pas mélanger une vidéo et des images.");
  }

  if (videos.length > 1) {
    throw new Error("Une seule vidéo est autorisée par publication.");
  }

  if (images.length > MAX_POST_IMAGES) {
    throw new Error(`${MAX_POST_IMAGES} images maximum par publication.`);
  }

  if (videos.length === 1) {
    const video = videos[0];
    const mimeType = normalizeMimeType(video.type);

    if (
      !["video/mp4", "video/webm", "video/quicktime"].includes(mimeType) ||
      video.size > MAX_POST_VIDEO_BYTES
    ) {
      throw new Error("La vidéo doit être au format MP4, WebM ou MOV et ne pas dépasser 50 Mo.");
    }

    const uploaded = await agent.uploadBlob(
      new Uint8Array(await video.arrayBuffer()),
      { encoding: mimeType }
    );

    return {
      $type: "app.bsky.embed.video",
      video: uploaded.data.blob,
      alt: (media?.altText || "").trim().slice(0, 1000),
    };
  }

  const uploadedImages = await Promise.all(
    images.map(async (image) => {
      const mimeType = normalizeMimeType(image.type);

      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType) ||
        image.size > MAX_POST_IMAGE_BYTES
      ) {
        throw new Error("Chaque image ou GIF doit faire moins de 10 Mo et utiliser un format compatible.");
      }

      const uploaded = await agent.uploadBlob(
        new Uint8Array(await image.arrayBuffer()),
        { encoding: mimeType }
      );

      return {
        alt: (media?.altText || "").trim().slice(0, 1000),
        image: uploaded.data.blob,
      };
    })
  );

  return {
    $type: "app.bsky.embed.images",
    images: uploadedImages,
  };
}

export async function createPost(
  text: string,
  media?: PostMediaInput
) {
  await requireIdentityVerification();

  const { agent, session } = await getAuthenticatedAgent();
  const hasMedia = Boolean(media?.files?.length);
  const richText = await buildRichText(text, agent, hasMedia);
  const embed = await buildMediaEmbed(agent, media);
  const explicitLabels = media?.labels;
  const effectiveLabels = explicitLabels !== undefined
    ? explicitLabels
    : consumeNextPostContentLabel();
  const labels = buildSelfLabels(effectiveLabels);

  const result = await agent.api.app.bsky.feed.post.create(
    { repo: session.did },
    {
      text: richText.text,
      facets: richText.facets,
      ...(embed ? { embed } : {}),
      ...(labels ? { labels } : {}),
      createdAt: new Date().toISOString(),
    }
  );

  return {
    uri: result.uri,
    cid: result.cid,
    text: richText.text,
    facets: richText.facets,
    embed,
    labels,
  };
}

export async function replyToPost(
  text: string,
  parent: ReplyTarget
) {
  await requireIdentityVerification();
  validateStrongRef(parent, "Publication parente");

  const root: StrongRef = parent.root || {
    $type: "com.atproto.repo.strongRef",
    uri: parent.uri,
    cid: parent.cid,
  };

  validateStrongRef(root, "Publication racine");

  const { agent, session } = await getAuthenticatedAgent();
  const richText = await buildRichText(text, agent);

  const result = await agent.api.app.bsky.feed.post.create(
    { repo: session.did },
    {
      text: richText.text,
      facets: richText.facets,
      reply: {
        root,
        parent: {
          $type: "com.atproto.repo.strongRef",
          uri: parent.uri,
          cid: parent.cid,
        },
      },
      createdAt: new Date().toISOString(),
    }
  );

  return {
    uri: result.uri,
    cid: result.cid,
    text: richText.text,
    facets: richText.facets,
    reply: {
      root,
      parent: {
        $type: "com.atproto.repo.strongRef",
        uri: parent.uri,
        cid: parent.cid,
      },
    },
  };
}

export async function likePost(post: StrongRef): Promise<string> {
  validateStrongRef(post, "Publication");

  const { agent, session } = await getAuthenticatedAgent();

  const result = await agent.api.app.bsky.feed.like.create(
    { repo: session.did },
    {
      subject: {
        $type: "com.atproto.repo.strongRef",
        uri: post.uri,
        cid: post.cid,
      },
      createdAt: new Date().toISOString(),
    }
  );

  return result.uri;
}

export async function unlikePost(likeUri: string): Promise<void> {
  if (!likeUri?.startsWith("at://")) {
    throw new Error("URI du like invalide.");
  }

  const { agent, session } = await getAuthenticatedAgent();
  const rkey = likeUri.split("/").pop();

  if (!rkey) throw new Error("Clé du like introuvable.");

  await agent.api.app.bsky.feed.like.delete({
    repo: session.did,
    rkey,
  });
}

export async function repostPost(post: StrongRef): Promise<string> {
  validateStrongRef(post, "Publication");

  const { agent, session } = await getAuthenticatedAgent();

  const result = await agent.api.app.bsky.feed.repost.create(
    { repo: session.did },
    {
      subject: {
        $type: "com.atproto.repo.strongRef",
        uri: post.uri,
        cid: post.cid,
      },
      createdAt: new Date().toISOString(),
    }
  );

  return result.uri;
}

export async function undoRepost(repostUri: string): Promise<void> {
  if (!repostUri?.startsWith("at://")) {
    throw new Error("URI de republication invalide.");
  }

  const { agent, session } = await getAuthenticatedAgent();
  const rkey = repostUri.split("/").pop();

  if (!rkey) throw new Error("Clé de republication introuvable.");

  await agent.api.app.bsky.feed.repost.delete({
    repo: session.did,
    rkey,
  });
}

export async function deleteOwnPost(uri: string): Promise<void> {
  await requireIdentityVerification();

  if (!uri?.startsWith("at://")) {
    throw new Error("URI de publication invalide.");
  }

  const { agent, session } = await getAuthenticatedAgent();
  const rkey = uri.split("/").pop();

  if (!rkey) throw new Error("Clé de publication introuvable.");

  await agent.api.app.bsky.feed.post.delete({
    repo: session.did,
    rkey,
  });
}
