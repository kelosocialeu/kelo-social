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
    const { accessJwt, refreshJwt, pdsUrl, handle, did } = await request.json();

    if (!accessJwt || !pdsUrl || !handle) {
      return NextResponse.json({ isAdmin: false }, { status: 400 });
    }

    const agent = new AtpAgent({ service: pdsUrl });
    await agent.resumeSession({
      accessJwt,
      refreshJwt: refreshJwt || "",
      active: true,
      handle,
      did: did || "",
    });

    // resumeSession() n'initialise que l'état local de l'agent : il ne
    // vérifie rien auprès du serveur. On force ici un vrai appel réseau
    // vers le PDS d'origine pour valider le token et récupérer le handle
    // CONFIRMÉ par le serveur — jamais celui envoyé tel quel par le client.
    const sessionRes = await agent.api.com.atproto.server.getSession();
    const verifiedHandle = sessionRes.data.handle?.toLowerCase().trim();

    const admins = getAdminHandles();
    const isAdmin = !!verifiedHandle && admins.includes(verifiedHandle);

    if (!isAdmin) {
      console.warn("[admin/verify] accès refusé", { verifiedHandle, admins, pdsUrl });
    }

    return NextResponse.json({ isAdmin });
  } catch (err) {
    console.error("[admin/verify] erreur de validation de session", err);
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
