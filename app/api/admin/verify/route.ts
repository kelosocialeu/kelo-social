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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const accessJwt =
      typeof body.accessJwt === "string" ? body.accessJwt : "";

    const refreshJwt =
      typeof body.refreshJwt === "string" ? body.refreshJwt : "";

    const pdsUrl =
      typeof body.pdsUrl === "string" ? body.pdsUrl.trim() : "";

    const handle =
      typeof body.handle === "string" ? body.handle.trim() : "";

    const did =
      typeof body.did === "string" ? body.did.trim() : "";

    if (!accessJwt || !pdsUrl || !handle || !did) {
      return NextResponse.json(
        {
          isAdmin: false,
          error: "Session incomplète.",
        },
        {
          status: 400,
        }
      );
    }

    const agent = new AtpAgent({
      service: pdsUrl,
    });

    await agent.resumeSession({
      accessJwt,
      refreshJwt,
      active: true,
      handle,
      did,
    });

    /*
     * Appel réel au PDS afin de ne pas faire confiance aux informations
     * envoyées directement par le navigateur.
     */
    const sessionResponse =
      await agent.api.com.atproto.server.getSession();

    const verifiedHandle = normalizeHandle(
      sessionResponse.data.handle || ""
    );

    const verifiedDid = (
      sessionResponse.data.did || ""
    )
      .trim()
      .toLowerCase();

    const adminHandles = getAdminHandles();
    const adminDids = getAdminDids();

    const allowedByDid =
      !!verifiedDid && adminDids.includes(verifiedDid);

    const allowedByHandle =
      !!verifiedHandle &&
      adminHandles.includes(verifiedHandle);

    const isAdmin = allowedByDid || allowedByHandle;

    if (!isAdmin) {
      console.warn("[admin/verify] Accès refusé", {
        verifiedHandle,
        verifiedDid,
        configuredAdminHandles: adminHandles,
        configuredAdminDids: adminDids,
        pdsUrl,
      });
    }

    return NextResponse.json({
      isAdmin,
    });
    
    console.log("========== ADMIN DEBUG ==========");
console.log("verifiedHandle :", verifiedHandle);
console.log("verifiedDid :", verifiedDid);
console.log("ADMIN_HANDLES :", adminHandles);
console.log("ADMIN_DIDS :", adminDids);
console.log("isAdmin :", isAdmin);
console.log("================================");
    
  } catch (error) {
    console.error(
      "[admin/verify] Erreur de validation de session",
      error
    );

    return NextResponse.json(
      {
        isAdmin: false,
      },
      {
        status: 200,
      }
    );
  }
}
