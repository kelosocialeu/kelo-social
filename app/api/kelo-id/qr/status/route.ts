import { NextResponse } from "next/server";

import {
  callKeloId,
  publishKeloIdVerification,
  verifyBrowserSession,
} from "@/lib/server/kelo-id-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = String(body?.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Challenge QR manquant." },
        { status: 400 }
      );
    }

    const user = await verifyBrowserSession(
      body?.session
    );

    const response = await callKeloId(
      `/api/integrations/kelo-social/challenges?id=${encodeURIComponent(
        id
      )}`,
      {
        method: "GET",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error ||
            "Impossible de vérifier le QR.",
        },
        { status: response.status }
      );
    }

    if (data.status !== "approved") {
      return NextResponse.json({
        status: data.status,
      });
    }

    if (data.did !== user.did) {
      return NextResponse.json(
        {
          error:
            "Ce QR a été confirmé par un autre compte AT Protocol.",
        },
        { status: 403 }
      );
    }

    await publishKeloIdVerification(user);

    return NextResponse.json({
      status: "approved",
      verified: true,
    });
  } catch (error) {
    console.error("[kelo-id/qr/status]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Validation du QR impossible.",
      },
      { status: 500 }
    );
  }
}
