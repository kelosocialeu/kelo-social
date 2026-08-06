import { NextResponse } from "next/server";

import {
  callKeloId,
  publishKeloIdVerification,
  verifyBrowserSession,
} from "@/lib/server/kelo-id-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body?.code || "")
      .trim()
      .toUpperCase();

    if (!code) {
      return NextResponse.json(
        { error: "Code Kelo ID manquant." },
        { status: 400 }
      );
    }

    const user = await verifyBrowserSession(
      body?.session
    );

    const response = await callKeloId(
      "/api/integrations/kelo-social/codes/redeem",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error ||
            "Le code Kelo ID est invalide.",
        },
        { status: response.status }
      );
    }

    if (data.did !== user.did) {
      return NextResponse.json(
        {
          error:
            "Ce code appartient à un autre compte AT Protocol.",
        },
        { status: 403 }
      );
    }

    await publishKeloIdVerification({
      ...user,
      verificationType: data.verificationType,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      verificationType:
        data.verificationType || "human",
    });
  } catch (error) {
    console.error("[kelo-id/code]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Validation impossible.",
      },
      { status: 500 }
    );
  }
}
