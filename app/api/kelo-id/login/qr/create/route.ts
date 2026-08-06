import crypto from "crypto";
import { NextResponse } from "next/server";

import { callKeloId } from "@/lib/server/kelo-id-verification";

export async function POST() {
  try {
    const clientState = crypto.randomUUID();

    const response = await callKeloId(
      "/api/integrations/kelo-social/challenges",
      {
        method: "POST",
        body: JSON.stringify({
          purpose: "kelo_social_login",
          clientState,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error ||
            "Impossible de créer le QR de connexion Kelo ID.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      id: data.id,
      expiresAt: data.expiresAt,
      qrPayload: data.qrPayload,
      clientState,
    });
  } catch (error) {
    console.error("[kelo-id/login/qr/create]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Création du QR de connexion impossible.",
      },
      { status: 500 }
    );
  }
}
