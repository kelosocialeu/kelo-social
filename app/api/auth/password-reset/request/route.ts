import { NextResponse } from "next/server";

import { discoverAccount } from "@/lib/atproto/discovery";

export const runtime = "nodejs";

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

async function getKeloAccountEmail(pdsUrl: string, did: string) {
  const adminPassword = process.env.PDS_ADMIN_PASSWORD?.trim();

  if (!adminPassword) {
    throw new Error(
      "La récupération par handle n’est pas configurée côté serveur."
    );
  }

  const url = new URL(
    `${normalizeOrigin(pdsUrl)}/xrpc/com.atproto.admin.getAccountInfo`
  );
  url.searchParams.set("did", did);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`admin:${adminPassword}`).toString("base64")}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      "Impossible de retrouver l’adresse associée à ce compte Kelo."
    );
  }

  const data = (await response.json()) as { email?: unknown };

  if (typeof data.email !== "string" || !data.email.trim()) {
    throw new Error(
      "Aucune adresse e-mail de récupération n’est disponible pour ce compte."
    );
  }

  return data.email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier || "").trim();

    if (!identifier) {
      return NextResponse.json(
        { error: "Le handle est obligatoire." },
        { status: 400 }
      );
    }

    const account = await discoverAccount(identifier);
    const keloPdsUrl = normalizeOrigin(
      process.env.KELO_ADMIN_PDS_URL || "https://pds.kelosocial.eu"
    );
    const accountPdsUrl = normalizeOrigin(account.pdsUrl);

    if (accountPdsUrl !== keloPdsUrl) {
      return NextResponse.json(
        {
          error:
            "Ce compte est hébergé sur un PDS externe. L’AT Protocol ne permet pas à Kelo Social de lire l’adresse e-mail privée d’un autre PDS à partir du handle. Utilisez la procédure de récupération proposée par ce PDS.",
          externalPds: true,
          pdsUrl: account.pdsUrl,
        },
        { status: 400 }
      );
    }

    const email = await getKeloAccountEmail(account.pdsUrl, account.did);
    const response = await fetch(
      `${accountPdsUrl}/xrpc/com.atproto.server.requestPasswordReset`,
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
        "Si ce compte peut être récupéré, un code a été envoyé à l’adresse e-mail associée. L’adresse reste masquée.",
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
