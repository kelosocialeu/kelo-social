import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const CERTIFICATION_COLLECTION = "eu.kelosocial.certification";

function getAdminHandles(): string[] {
  return (process.env.ADMIN_HANDLES || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const { session, targetHandle, status } = await request.json();

    if (!session?.accessJwt || !session?.pdsUrl || !session?.handle) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const agent = new AtpAgent({ service: session.pdsUrl });
    await agent.resumeSession({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt || "",
      active: true,
      handle: session.handle,
      did: session.did || "",
    });

    const verifiedHandle = agent.session?.handle?.toLowerCase();
    const admins = getAdminHandles();
    if (!verifiedHandle || !admins.includes(verifiedHandle) || !agent.session?.did) {
      return NextResponse.json({ error: "Accès refusé : réservé aux administrateurs." }, { status: 403 });
    }

    if (!targetHandle) {
      return NextResponse.json({ error: "Handle manquant." }, { status: 400 });
    }

    const cleanHandle = targetHandle.replace(/^@/, "").trim();
    const adminDid = agent.session.did;

    // Résout le handle cible vers son DID, quel que soit son PDS d'origine
    // (Bluesky, WSocial, Eurosky, Kelo Social...).
    const resolved = await agent.api.com.atproto.identity.resolveHandle({ handle: cleanHandle });
    const subjectDid = resolved.data.did;

    if (status === "none") {
      try {
        await agent.api.com.atproto.repo.deleteRecord({
          repo: adminDid,
          collection: CERTIFICATION_COLLECTION,
          rkey: subjectDid,
        });
      } catch {
        // Rien à révoquer : ce n'est pas une erreur.
      }
      return NextResponse.json({ success: true });
    }

    // Publication dans le dépôt AT Protocol de @kelosocial.eu — visible
    // par tout client du réseau fédéré, pas seulement ce panneau.
    await agent.api.com.atproto.repo.putRecord({
      repo: adminDid,
      collection: CERTIFICATION_COLLECTION,
      rkey: subjectDid,
      record: {
        $type: CERTIFICATION_COLLECTION,
        subjectDid,
        subjectHandle: cleanHandle,
        status,
        issuedAt: new Date().toISOString(),
      },
      validate: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur serveur." }, { status: 500 });
  }
}
