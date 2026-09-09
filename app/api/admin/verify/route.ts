import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
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
    .map((did) => did.trim().toLowerCase())
    .filter(Boolean);
}

async function getConfiguredAdminIdentity() {
  const identifier = normalizeHandle(
    process.env.KELO_ADMIN_ATPROTO_IDENTIFIER || ""
  );
  const password = process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim() || "";
  const pdsUrl = process.env.KELO_ADMIN_PDS_URL?.trim() || "";

  if (!identifier || !password || !pdsUrl) return null;

  const adminAgent = new AtpAgent({ service: pdsUrl });
  await adminAgent.login({ identifier, password });

  const session = await adminAgent.api.com.atproto.server.getSession();

  return {
    handle: normalizeHandle(session.data.handle || identifier),
    did: (session.data.did || "").trim().toLowerCase(),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const accessJwt = typeof body.accessJwt === "string" ? body.accessJwt : "";
    const refreshJwt = typeof body.refreshJwt === "string" ? body.refreshJwt : "";
    const pdsUrl = typeof body.pdsUrl === "string" ? body.pdsUrl.trim() : "";
    const handle = typeof body.handle === "string" ? body.handle.trim() : "";
    const did = typeof body.did === "string" ? body.did.trim() : "";

    if (!accessJwt || !pdsUrl || !handle || !did) {
      return NextResponse.json(
        { isAdmin: false, error: "Session incomplète." },
        { status: 400 }
      );
    }

    const agent = new AtpAgent({ service: pdsUrl });

    await agent.resumeSession({
      accessJwt,
      refreshJwt,
      active: true,
      handle,
      did,
    });

    const sessionResponse = await agent.api.com.atproto.server.getSession();

    const verifiedHandle = normalizeHandle(sessionResponse.data.handle || "");
    const verifiedDid = (sessionResponse.data.did || "").trim().toLowerCase();

    let isAdmin = false;

    // Source de vérité principale : le compte administrateur configuré
    // avec les variables KELO_ADMIN_ATPROTO_*.
    try {
      const configuredAdmin = await getConfiguredAdminIdentity();

      if (configuredAdmin) {
        isAdmin =
          (!!verifiedDid && verifiedDid === configuredAdmin.did) ||
          (!!verifiedHandle && verifiedHandle === configuredAdmin.handle);
      }
    } catch (error) {
      console.error(
        "[admin/verify] Impossible de vérifier le compte administrateur configuré",
        error
      );
    }

    // Compatibilité avec l'ancienne configuration.
    if (!isAdmin) {
      const adminHandles = getAdminHandles();
      const adminDids = getAdminDids();

      isAdmin =
        (!!verifiedDid && adminDids.includes(verifiedDid)) ||
        (!!verifiedHandle && adminHandles.includes(verifiedHandle));
    }

    if (!isAdmin) {
      console.warn("[admin/verify] Accès refusé", {
        verifiedHandle,
        verifiedDid,
        pdsUrl,
      });
    }

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error(
      "[admin/verify] Erreur de validation de session",
      error
    );

    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
