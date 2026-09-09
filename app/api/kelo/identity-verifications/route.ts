import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.identityverification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variable ${name} manquante.`);
  }
  return value;
}

async function createAuthoritativeAgent() {
  // Les vérifications d'identité sont publiées par le compte AT Protocol
  // administrateur de Kelo Social. Il faut donc lire le dépôt de ce DID,
  // et non tenter de résoudre un ancien handle sur un ancien PDS.
  const service = requiredEnv("KELO_ADMIN_PDS_URL");
  const identifier = requiredEnv("KELO_ADMIN_ATPROTO_IDENTIFIER");
  const password = requiredEnv("KELO_ADMIN_ATPROTO_PASSWORD");

  const agent = new AtpAgent({ service });
  const response = await agent.login({ identifier, password });

  if (!response.data.did) {
    throw new Error("Le compte AT Protocol administrateur n'a pas de DID actif.");
  }

  return { agent, repo: response.data.did };
}

export async function GET() {
  try {
    const { agent, repo } = await createAuthoritativeAgent();
    const records: unknown[] = [];
    let cursor: string | undefined;

    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo,
        collection: COLLECTION,
        limit: 100,
        cursor,
      });

      records.push(...response.data.records.map((item) => item.value));
      cursor = response.data.cursor;
    } while (cursor);

    return NextResponse.json(
      {
        records,
        meta: {
          count: records.length,
          repo,
          fetchedAt: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (error) {
    console.error("[api/kelo/identity-verifications] lecture impossible", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Impossible de charger les vérifications d’identité : ${error.message}`
            : "Impossible de charger les vérifications d’identité.",
        records: [],
      },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
