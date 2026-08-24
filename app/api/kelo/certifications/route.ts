import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.certification";
const REPO_IDENTIFIER =
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const REPO_APP_PASSWORD =
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() || "";
const PDS =
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  process.env.NEXT_PUBLIC_ADMIN_REPO_PDS_URL?.trim() ||
  "https://eurosky.social";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function createAuthoritativeAgent() {
  const agent = new AtpAgent({ service: PDS });

  // IMPORTANT : l'écriture des certifications se fait avec ce même compte.
  // Quand le mot de passe d'application est disponible, on se connecte d'abord
  // et on lit la collection par le DID réel de la session. Cela évite qu'une
  // résolution de handle/PDS temporairement obsolète fasse lire un ancien dépôt.
  if (REPO_APP_PASSWORD) {
    await agent.login({
      identifier: REPO_IDENTIFIER,
      password: REPO_APP_PASSWORD,
    });

    if (!agent.session?.did) {
      throw new Error("Le dépôt central de certification n'a pas de DID actif.");
    }

    return { agent, repo: agent.session.did, authenticated: true };
  }

  // Fallback public seulement si la variable secrète n'est pas configurée.
  return { agent, repo: REPO_IDENTIFIER, authenticated: false };
}

export async function GET() {
  try {
    const { agent, repo, authenticated } = await createAuthoritativeAgent();
    const records: unknown[] = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo,
        collection: COLLECTION,
        limit: 100,
        cursor,
      });

      records.push(...response.data.records.map((item) => item.value));
      cursor = response.data.cursor;
      pages += 1;
    } while (cursor);

    return NextResponse.json(
      {
        records,
        meta: {
          count: records.length,
          pages,
          repo,
          authenticated,
          fetchedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("[api/kelo/certifications] lecture autoritative impossible", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Impossible de charger les certifications Kelo Social : ${error.message}`
            : "Impossible de charger les certifications Kelo Social.",
        records: [],
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}
