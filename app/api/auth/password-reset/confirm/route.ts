import { NextResponse } from "next/server";

import { discoverAccount } from "@/lib/atproto/discovery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier || "").trim();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!identifier || !token || !password) {
      return NextResponse.json(
        {
          error:
            "Le handle, le code reçu et le nouveau mot de passe sont obligatoires.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
        },
        { status: 400 }
      );
    }

    const account = await discoverAccount(identifier);
    const response = await fetch(
      `${account.pdsUrl.replace(/\/$/, "")}/xrpc/com.atproto.server.resetPassword`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token, password }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      let message =
        "Le code est invalide, expiré ou le PDS a refusé le nouveau mot de passe.";

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
      message:
        "Votre mot de passe AT Protocol a été modifié. Vous pouvez maintenant vous connecter.",
    });
  } catch (error) {
    console.error("[password-reset/confirm]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Réinitialisation impossible.",
      },
      { status: 500 }
    );
  }
}
