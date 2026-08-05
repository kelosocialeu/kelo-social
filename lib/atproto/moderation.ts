import {
  getAuthenticatedAgent,
} from "@/services/auth.service";

/**
 * Labeler qui recevra les signalements.
 *
 * La valeur peut être modifiée dans les variables
 * d’environnement de Vercel.
 */
const MODERATION_LABELER_DID =
  process.env.NEXT_PUBLIC_MODERATION_LABELER_DID?.trim() ||
  "did:plc:ar7c4by46qjdydhdevvrndac";

async function getModAgent() {
  const { agent, session } =
    await getAuthenticatedAgent();

  return {
    agent,
    myDid: session.did,
  };
}

/**
 * Retourne un agent configuré pour transmettre les signalements
 * au service de modération choisi.
 *
 * AT Protocol utilise le proxy de service `atproto_labeler`
 * pour envoyer un rapport à un Labeler précis.
 */
async function getReportingAgent() {
  const { agent } =
    await getModAgent();

  return agent.withProxy(
    "atproto_labeler",
    MODERATION_LABELER_DID
  );
}

function getRkeyFromUri(
  uri: string,
  label: string
): string {
  if (!uri?.startsWith("at://")) {
    throw new Error(
      `${label} : URI AT Protocol invalide.`
    );
  }

  const rkey = uri.split("/").pop();

  if (!rkey) {
    throw new Error(
      `${label} : clé de record introuvable.`
    );
  }

  return rkey;
}

function validateDid(
  did: string
): void {
  if (!did?.startsWith("did:")) {
    throw new Error(
      "DID du compte invalide."
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            Blocage et masquage                              */
/* -------------------------------------------------------------------------- */

export async function blockActor(
  did: string
): Promise<void> {
  validateDid(did);

  const { agent, myDid } =
    await getModAgent();

  await agent.api.app.bsky.graph.block.create(
    {
      repo: myDid,
    },
    {
      subject: did,
      createdAt: new Date().toISOString(),
    }
  );
}

export async function unblockActor(
  blockUri: string
): Promise<void> {
  const { agent, myDid } =
    await getModAgent();

  const rkey = getRkeyFromUri(
    blockUri,
    "Blocage"
  );

  await agent.api.app.bsky.graph.block.delete({
    repo: myDid,
    rkey,
  });
}

export async function muteActor(
  did: string
): Promise<void> {
  validateDid(did);

  const { agent } =
    await getModAgent();

  await agent.api.app.bsky.graph.muteActor(
    {
      actor: did,
    },
    {
      encoding: "application/json",
    }
  );
}

export async function unmuteActor(
  did: string
): Promise<void> {
  validateDid(did);

  const { agent } =
    await getModAgent();

  await agent.api.app.bsky.graph.unmuteActor(
    {
      actor: did,
    },
    {
      encoding: "application/json",
    }
  );
}

export async function listMutedAccounts(
  limit = 50,
  cursor?: string
) {
  const { agent } =
    await getModAgent();

  const response =
    await agent.api.app.bsky.graph.getMutes({
      limit,
      cursor,
    });

  return {
    items: response.data.mutes,
    cursor: response.data.cursor,
  };
}

export async function listBlockedAccounts(
  limit = 50,
  cursor?: string
) {
  const { agent } =
    await getModAgent();

  const response =
    await agent.api.app.bsky.graph.getBlocks({
      limit,
      cursor,
    });

  return {
    items: response.data.blocks,
    cursor: response.data.cursor,
  };
}

/* -------------------------------------------------------------------------- */
/*                                Signalements                                 */
/* -------------------------------------------------------------------------- */

export type ReportReason =
  | "com.atproto.moderation.defs#reasonSpam"
  | "com.atproto.moderation.defs#reasonViolation"
  | "com.atproto.moderation.defs#reasonMisleading"
  | "com.atproto.moderation.defs#reasonSexual"
  | "com.atproto.moderation.defs#reasonRude"
  | "com.atproto.moderation.defs#reasonOther";

function cleanReportDescription(
  description?: string
): string | undefined {
  const cleaned = description
    ?.trim()
    .slice(0, 2000);

  return cleaned || undefined;
}

/**
 * Signale une publication au Labeler configuré.
 */
export async function reportPost(
  uri: string,
  cid: string,
  reasonType: ReportReason,
  description?: string
): Promise<void> {
  if (!uri?.startsWith("at://")) {
    throw new Error(
      "URI de publication invalide."
    );
  }

  if (!cid?.trim()) {
    throw new Error(
      "CID de publication manquant."
    );
  }

  const reportingAgent =
    await getReportingAgent();

  await reportingAgent.api.com.atproto.moderation.createReport(
    {
      reasonType,
      reason:
        cleanReportDescription(description),
      subject: {
        $type:
          "com.atproto.repo.strongRef",
        uri,
        cid,
      },
    },
    {
      encoding: "application/json",
    }
  );
}

/**
 * Signale un compte complet au Labeler configuré.
 */
export async function reportAccount(
  did: string,
  reasonType: ReportReason,
  description?: string
): Promise<void> {
  validateDid(did);

  const reportingAgent =
    await getReportingAgent();

  await reportingAgent.api.com.atproto.moderation.createReport(
    {
      reasonType,
      reason:
        cleanReportDescription(description),
      subject: {
        $type:
          "com.atproto.admin.defs#repoRef",
        did,
      },
    },
    {
      encoding: "application/json",
    }
  );
}
