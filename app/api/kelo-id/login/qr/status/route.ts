import { NextResponse } from "next/server";

import { callKeloId } from "@/lib/server/kelo-id-verification";

interface KeloIdAtSession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  pdsUrl: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const clientState = url.searchParams.get("clientState") || "";

    if (!id || !clientState) {
      return NextResponse.json(
        { error: "Challenge de connexion incomplet." },
        { status: 400 }
      );
    }

    const response = await callKeloId(
      `/api/integrations/kelo-social/challenges?id=${encodeURIComponent(id)}`,
      { method: "GET" }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Connexion Kelo ID impossible." },
        { status: response.status }
      );
    }

    if (data.status !== "approved") {
      return NextResponse.json({ status: data.status });
    }

    if (
      data.purpose !== "kelo_social_login" ||
      data.clientState !== clientState
    ) {
      return NextResponse.json(
        { error: "La confirmation Kelo ID ne correspond pas à cette connexion." },
        { status: 409 }
      );
    }

    const session = data.atSession as KeloIdAtSession | undefined;

    if (
      !session?.accessJwt ||
      !session?.refreshJwt ||
      !session?.handle ||
      !session?.did ||
      !session?.pdsUrl
    ) {
      return NextResponse.json(
        { error: "Session AT Protocol Kelo ID incomplète." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      status: "approved",
      session,
    });
  } catch (error) {
    console.error("[kelo-id/login/qr/status]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Vérification du QR de connexion impossible.",
      },
      { status: 500 }
    );
  }
}
