import { RichText } from "@atproto/api";

import {
  getAuthenticatedAgent,
} from "@/services/auth.service";

export interface StrongRef {
  uri: string;
  cid: string;
  $type?: "com.atproto.repo.strongRef";
  [key: string]: unknown;
}

export interface ReplyTarget extends StrongRef {
  /**
   * Référence de la publication racine.
   * Pour une réponse directe, elle peut être identique au parent.
   */
  root?: StrongRef;
}

function validateStrongRef(
  ref: StrongRef,
  label: string
): void {
  if (!ref.uri?.startsWith("at://")) {
    throw new Error(
      `${label} : URI AT Protocol invalide.`
    );
  }

  if (!ref.cid?.trim()) {
    throw new Error(
      `${label} : CID manquant.`
    );
  }
}

async function buildRichText(
  text: string,
  agent: any
) {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error(
      "Le texte de la publication est vide."
    );
  }

  const richText = new RichText({
    text: cleanText,
  });

  await richText.detectFacets(agent);

  return richText;
}

/**
 * Publie un nouveau post dans le PDS du compte connecté.
 */
export async function createPost(text: string) {
  const { agent, session } =
    await getAuthenticatedAgent();

  const richText = await buildRichText(
    text,
    agent
  );

  const result =
    await agent.api.app.bsky.feed.post.create(
      {
        repo: session.did,
      },
      {
        text: richText.text,
        facets: richText.facets,
        createdAt: new Date().toISOString(),
      }
    );

  return {
    uri: result.uri,
    cid: result.cid,
    text: richText.text,
    facets: richText.facets,
  };
}

/**
 * Répond réellement à une publication.
 *
 * `parent` représente la publication à laquelle l’utilisateur répond.
 * `root` représente le premier post du fil. Pour une réponse directe,
 * parent et root sont identiques.
 */
export async function replyToPost(
  text: string,
  parent: ReplyTarget
) {
  validateStrongRef(parent, "Publication parente");

  const root: StrongRef = parent.root || {
    $type: "com.atproto.repo.strongRef",
    uri: parent.uri,
    cid: parent.cid,
  };

  validateStrongRef(root, "Publication racine");

  const { agent, session } =
    await getAuthenticatedAgent();

  const richText = await buildRichText(
    text,
    agent
  );

  const result =
    await agent.api.app.bsky.feed.post.create(
      {
        repo: session.did,
      },
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

/**
 * Ajoute un like réel dans le PDS de l’utilisateur.
 *
 * Retourne l’URI du record de like, utilisée ensuite pour l’annuler.
 */
export async function likePost(
  post: StrongRef
): Promise<string> {
  validateStrongRef(post, "Publication");

  const { agent, session } =
    await getAuthenticatedAgent();

  const result =
    await agent.api.app.bsky.feed.like.create(
      {
        repo: session.did,
      },
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

/**
 * Supprime un like à partir de l’URI du record de like
 * fournie dans `post.viewer.like`.
 */
export async function unlikePost(
  likeUri: string
): Promise<void> {
  if (!likeUri?.startsWith("at://")) {
    throw new Error(
      "URI du like invalide."
    );
  }

  const { agent, session } =
    await getAuthenticatedAgent();

  const rkey = likeUri.split("/").pop();

  if (!rkey) {
    throw new Error(
      "Clé du like introuvable."
    );
  }

  await agent.api.app.bsky.feed.like.delete({
    repo: session.did,
    rkey,
  });
}

/**
 * Crée une republication réelle dans le PDS de l’utilisateur.
 *
 * Retourne l’URI du record de repost.
 */
export async function repostPost(
  post: StrongRef
): Promise<string> {
  validateStrongRef(post, "Publication");

  const { agent, session } =
    await getAuthenticatedAgent();

  const result =
    await agent.api.app.bsky.feed.repost.create(
      {
        repo: session.did,
      },
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

/**
 * Annule une republication à partir de l’URI contenue
 * dans `post.viewer.repost`.
 */
export async function undoRepost(
  repostUri: string
): Promise<void> {
  if (!repostUri?.startsWith("at://")) {
    throw new Error(
      "URI de republication invalide."
    );
  }

  const { agent, session } =
    await getAuthenticatedAgent();

  const rkey = repostUri.split("/").pop();

  if (!rkey) {
    throw new Error(
      "Clé de republication introuvable."
    );
  }

  await agent.api.app.bsky.feed.repost.delete({
    repo: session.did,
    rkey,
  });
}

/**
 * Supprime une publication appartenant au compte connecté.
 */
export async function deleteOwnPost(
  uri: string
): Promise<void> {
  if (!uri?.startsWith("at://")) {
    throw new Error(
      "URI de publication invalide."
    );
  }

  const { agent, session } =
    await getAuthenticatedAgent();

  const rkey = uri.split("/").pop();

  if (!rkey) {
    throw new Error(
      "Clé de publication introuvable."
    );
  }

  await agent.api.app.bsky.feed.post.delete({
    repo: session.did,
    rkey,
  });
}
