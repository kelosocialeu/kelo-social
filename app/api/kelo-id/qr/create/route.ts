import { NextResponse } from "next/server";

import {
  callKeloId,
  verifyBrowserSession,
} from "@/lib/server/kelo-id-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await verifyBrowserSession(
      body?.session
    );

    const response = await callKeloId(
      "/api/integrations/kelo-social/challenges",
      {
        method: "POST",
        body: JSON.stringify({
          purpose:
            "kelo_social_verification",
          clientState: user.did,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error ||
            "Impossible de créer le QR Kelo ID.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      id: data.id,
      expiresAt: data.expiresAt,
      qrPayload: data.qrPayload,
    });
  } catch (error) {
    console.error("[kelo-id/qr/create]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Création du QR impossible.",
      },
      { status: 500 }
    );
  }
}
