import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

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
    if (!verifiedHandle || !admins.includes(verifiedHandle)) {
      return NextResponse.json({ error: "Accès refusé : réservé aux administrateurs." }, { status: 403 });
    }

    if (!targetHandle || !status) {
      return NextResponse.json({ error: "Handle ou statut manquant." }, { status: 400 });
    }

    // ⚠️ Stockage TEMPORAIRE : aucune base de données n'est encore branchée
    // pour les certifications (prévu à l'étape "Certifications", avec Kelo ID
    // sur Supabase — cf. étapes 13/14). Cette route valide seulement le DROIT
    // d'agir ; la persistance réelle du badge sera ajoutée à cette étape-là.
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur." }, { status: 500 });
  }
}
