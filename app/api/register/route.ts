import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const KELO_PDS_URL = (
  process.env.KELO_PDS_URL ||
  process.env.NEXT_PUBLIC_KELO_PDS_URL ||
  "https://pds.kelosocial.eu"
).replace(/\/$/, "");

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;

  if (!hcaptchaSecret) {
    throw new Error("Configuration hCaptcha manquante sur le serveur.");
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret: hcaptchaSecret,
    response: token,
  });

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Le service anti-robot est temporairement indisponible.");
  }

  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

async function pdsRequiresInviteCode(): Promise<boolean> {
  const response = await fetch(
    `${KELO_PDS_URL}/xrpc/com.atproto.server.describeServer`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Impossible de vérifier la configuration du PDS Kelo Social (${response.status}).`
    );
  }

  const data = (await response.json()) as {
    inviteCodeRequired?: boolean;
  };

  return data.inviteCodeRequired === true;
}

async function createInviteCode(): Promise<string> {
  const adminPassword = process.env.PDS_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      "Le PDS exige un code d'invitation mais PDS_ADMIN_PASSWORD n'est pas configuré sur Kelo Social."
    );
  }

  const response = await fetch(
    `${KELO_PDS_URL}/xrpc/com.atproto.server.createInviteCode`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `admin:${adminPassword}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({ useCount: 1 }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("PDS invite creation failed:", response.status, detail);
    throw new Error(
      `Impossible de générer le code d'invitation sur le PDS (${response.status}).`
    );
  }

  const data = (await response.json()) as { code?: string };

  if (!data.code) {
    throw new Error("Le PDS n'a retourné aucun code d'invitation.");
  }

  return data.code;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      handle?: string;
      email?: string;
      password?: string;
      birthDate?: string;
      hcaptchaToken?: string;
    };

    const handle = normalizeHandle(body.handle || "");
    const email = (body.email || "").trim();
    const password = body.password || "";
    const birthDate = body.birthDate || "";
    const hcaptchaToken = body.hcaptchaToken || "";

    if (!handle || !email || !password || !birthDate) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis." },
        { status: 400 }
      );
    }

    const birth = new Date(birthDate);

    if (Number.isNaN(birth.getTime())) {
      return NextResponse.json(
        { error: "Date de naissance invalide." },
        { status: 400 }
      );
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const birthdayPassed =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() >= birth.getDate());

    if (!birthdayPassed) age -= 1;

    if (age < 18) {
      return NextResponse.json(
        { error: "Vous devez avoir 18 ans ou plus pour vous inscrire." },
        { status: 403 }
      );
    }

    if (!(await verifyCaptcha(hcaptchaToken))) {
      return NextResponse.json(
        { error: "La vérification anti-robot a échoué. Veuillez réessayer." },
        { status: 400 }
      );
    }

    const inviteCodeRequired = await pdsRequiresInviteCode();
    const inviteCode = inviteCodeRequired
      ? await createInviteCode()
      : undefined;

    const agent = new AtpAgent({ service: KELO_PDS_URL });
    const fullHandle = handle.includes(".")
      ? handle
      : `${handle}.kelosocial.eu`;

    await agent.createAccount({
      email,
      handle: fullHandle,
      password,
      ...(inviteCode ? { inviteCode } : {}),
    });

    return NextResponse.json({
      success: true,
      handle: fullHandle,
      pdsUrl: KELO_PDS_URL,
    });
  } catch (error: unknown) {
    console.error("Kelo Social registration error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de la création du compte.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
