import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

import {
  IDENTITY_VERIFICATION_COLLECTION,
} from "@/lib/atproto/identity-verifications";

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function getAdminHandles(): string[] {
  return [
    process.env.ADMIN_HANDLES || "",
    process.env.KELO_ADMIN_ATPROTO_IDENTIFIER || "",
  ]
    .flatMap((value) => value.split(","))
    .map(normalizeHandle)
    .filter(Boolean);
}

function getAdminDids(): string[] {
  return (process.env.ADMIN_DIDS || "")
    .split(",")
    .map(normalizeDid)
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const {
      session,
      targetHandle,
      verificationType,
      source,
      assignmentMode,
      remove,
    } = await request.json();

    if (!session?.accessJwt || !session?.pdsUrl) {
      return NextResponse.json(
        { error: "Session invalide." },
        { status: 401 }
      );
    }

    const agent = new AtpAgent({
      service: session.pdsUrl,
    });

    await agent.resumeSession({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt || "",
      handle: session.handle,
      did: session.did,
      active: true,
    });

    const sessionRes =
      await agent.api.com.atproto.server.getSession();

    const verifiedHandle = normalizeHandle(sessionRes.data.handle || "");
    const adminDid = normalizeDid(sessionRes.data.did || "");

    // Utiliser exactement la même définition d'administrateur que /api/admin/role :
    // le compte KELO_ADMIN_ATPROTO_* doit être reconnu comme administrateur même
    // si ADMIN_HANDLES/ADMIN_DIDS ne sont pas renseignés.
    const isAdmin =
      getAdminDids().includes(adminDid) ||
      getAdminHandles().includes(verifiedHandle);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const cleanHandle = targetHandle
      .trim()
      .replace(/^@/, "");

    const resolved =
      await agent.api.com.atproto.identity.resolveHandle({
        handle: cleanHandle,
      });

    const subjectDid = resolved.data.did;

    if (remove === true) {
      try {
        await agent.api.com.atproto.repo.deleteRecord({
          repo: adminDid,
          collection: IDENTITY_VERIFICATION_COLLECTION,
          rkey: subjectDid,
        });
      } catch {}

      return NextResponse.json({
        success: true,
      });
    }

    await agent.api.com.atproto.repo.putRecord({
      repo: adminDid,
      collection: IDENTITY_VERIFICATION_COLLECTION,
      rkey: subjectDid,
      record: {
        $type: IDENTITY_VERIFICATION_COLLECTION,
        subjectDid,
        subjectHandle: cleanHandle,
        verificationType,
        source,
        assignmentMode,
        issuedAt: new Date().toISOString(),
        issuerDid: adminDid,
        issuerHandle: verifiedHandle,
        schemaVersion: 1,
      },
      validate: false,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message || "Erreur serveur.",
      },
      {
        status: 500,
      }
    );
  }
}
