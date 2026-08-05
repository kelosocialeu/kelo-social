import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const CERTIFICATION_COLLECTION =
  "eu.kelosocial.certification";

type CertificationStatus =
  | "certified"
  | "trusted-verifier"
  | "none";

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function getAdminHandles(): string[] {
  return (process.env.ADMIN_HANDLES || "")
    .split(",")
    .map(normalizeHandle)
    .filter(Boolean);
}

function getAdminDids(): string[] {
  return (process.env.ADMIN_DIDS || "")
    .split(",")
    .map(normalizeDid)
    .filter(Boolean);
}

function isValidStatus(
  value: unknown
): value is CertificationStatus {
  return (
    value === "certified" ||
    value === "trusted-verifier" ||
    value === "none"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const session = body?.session;
    const rawTargetHandle =
      typeof body?.targetHandle === "string"
        ? body.targetHandle
        : "";

    const status = body?.status;

    if (
      !session?.accessJwt ||
      !session?.pdsUrl ||
      !session?.handle ||
      !session?.did
    ) {
      return NextResponse.json(
        {
          error:
            "Session invalide ou incomplète. Reconnectez-vous.",
        },
        { status: 401 }
      );
    }

    if (!rawTargetHandle.trim()) {
      return NextResponse.json(
        { error: "Handle du compte cible manquant." },
        { status: 400 }
      );
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: "Statut de certification invalide." },
        { status: 400 }
      );
    }

    const agent = new AtpAgent({
      service: session.pdsUrl,
    });

    await agent.resumeSession({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt || "",
      active: true,
      handle: session.handle,
      did: session.did,
    });

    /*
     * Validation réelle de la session auprès du PDS d’origine.
     * On ne fait pas confiance au handle ou au DID envoyés directement
     * par le navigateur.
     */
    const sessionResponse =
      await agent.api.com.atproto.server.getSession();

    const verifiedHandle = normalizeHandle(
      sessionResponse.data.handle || ""
    );

    const verifiedDid = normalizeDid(
      sessionResponse.data.did || ""
    );

    const adminHandles = getAdminHandles();
    const adminDids = getAdminDids();

    const allowedByDid =
      !!verifiedDid && adminDids.includes(verifiedDid);

    const allowedByHandle =
      !!verifiedHandle &&
      adminHandles.includes(verifiedHandle);

    if (!allowedByDid && !allowedByHandle) {
      console.warn("[admin/certify] Accès refusé", {
        verifiedHandle,
        verifiedDid,
        pdsUrl: session.pdsUrl,
      });

      return NextResponse.json(
        {
          error:
            "Accès refusé : cette action est réservée aux administrateurs.",
        },
        { status: 403 }
      );
    }

    const targetHandle = normalizeHandle(rawTargetHandle);

    const resolved =
      await agent.api.com.atproto.identity.resolveHandle({
        handle: targetHandle,
      });

    const subjectDid = resolved.data.did;

    if (!subjectDid) {
      return NextResponse.json(
        {
          error:
            "Impossible de trouver le DID du compte cible.",
        },
        { status: 404 }
      );
    }

    /*
     * Le DID sert de clé : un compte ne peut donc avoir qu’un seul
     * statut de certification actif dans cette collection.
     *
     * Les DIDs actuellement pris en charge par AT Protocol respectent
     * la syntaxe générale des record keys.
     */
    const recordKey = subjectDid.toLowerCase();

    if (status === "none") {
      try {
        await agent.api.com.atproto.repo.deleteRecord({
          repo: verifiedDid,
          collection: CERTIFICATION_COLLECTION,
          rkey: recordKey,
        });
      } catch (error) {
        /*
         * Si aucun record n’existe, la révocation est déjà effective.
         */
        console.info(
          "[admin/certify] Aucun record à révoquer",
          {
            subjectDid,
          }
        );
      }

      return NextResponse.json({
        success: true,
        action: "revoked",
        subjectDid,
        subjectHandle: targetHandle,
      });
    }

    const issuedAt = new Date().toISOString();

    const response =
      await agent.api.com.atproto.repo.putRecord({
        repo: verifiedDid,
        collection: CERTIFICATION_COLLECTION,
        rkey: recordKey,
        record: {
          $type: CERTIFICATION_COLLECTION,
          subjectDid,
          subjectHandle: targetHandle,
          status,
          issuedAt,
          issuerDid: verifiedDid,
          issuerHandle: verifiedHandle,
        },
        /*
         * La collection Kelo est un Lexicon personnalisé qui n’est pas
         * connu nativement par tous les PDS.
         */
        validate: false,
      });

    return NextResponse.json({
      success: true,
      action: "certified",
      uri: response.data.uri,
      cid: response.data.cid,
      subjectDid,
      subjectHandle: targetHandle,
      status,
      issuedAt,
    });
  } catch (error) {
    console.error("[admin/certify] Erreur", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur.",
      },
      { status: 500 }
    );
  }
}
