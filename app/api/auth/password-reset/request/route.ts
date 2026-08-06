import { NextResponse } from "next/server";

import { discoverAccount } from "@/lib/atproto/discovery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!identifier || !email) {
      return NextResponse.json(
        { error: "Le handle et l’adresse e-mail sont obligatoires." },
        { status: 400 }
      );
    }

    const account = await discoverAccount(identifier);
    const response = await fetch(
      `${account.pdsUrl.replace(/\/$/, "")}/xrpc/com.atproto.server.requestPasswordReset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      let message = "Le PDS n’a pas pu envoyer le code de réinitialisation.";

      try {
        const data = await response.json();
        if (typeof data?.message === "string") message = data.message;
      } catch {
        // Réponse non JSON du PDS.
      }

      return NextResponse.json(
        { error: message },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      pdsUrl: account.pdsUrl,
      message:
        "Un code de réinitialisation a été envoyé à l’adresse e-mail associée au compte.",
    });
  } catch (error) {
    console.error("[password-reset/request]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Demande de réinitialisation impossible.",
      },
      { status: 500 }
    );
  }
}
