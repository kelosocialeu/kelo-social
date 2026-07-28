import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

function getAdminHandles(): string[] {
  return (process.env.ADMIN_HANDLES || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Vérifie côté serveur si la session fournie appartient à un administrateur.
 * On ne fait JAMAIS confiance à une donnée envoyée par le client sans la
 * valider : ici, resumeSession() revalide le token directement auprès du
 * PDS d'origine, puis on compare le handle confirmé à ADMIN_HANDLES
 * (variable d'environnement serveur, jamais exposée au client).
 */
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

    const verifiedHandle = agent.session?.handle?.toLowerCase();
    const admins = getAdminHandles();
    const isAdmin = !!verifiedHandle && admins.includes(verifiedHandle);

    return NextResponse.json({ isAdmin });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
