import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";
import { randomUUID } from "crypto";

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

  if (!token) return false;

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

interface PdsSignupRequirements {
  inviteCodeRequired: boolean;
  verificationRequired: boolean;
}

async function getPdsSignupRequirements(): Promise<PdsSignupRequirements> {
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
    phoneVerificationRequired?: boolean;
  };

  return {
    inviteCodeRequired: data.inviteCodeRequired === true,
    // PDS Gatekeeper réutilise ce drapeau pour annoncer qu'un code de
    // vérification (obtenu après captcha) est requis par createAccount.
    verificationRequired: data.phoneVerificationRequired === true,
  };
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
        Authorization: `Basic ${Buffer.from(`admin:${adminPassword}`).toString("base64")}`,
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
  if (!data.code) throw new Error("Le PDS n'a retourné aucun code d'invitation.");
  return data.code;
}

/**
 * PDS Gatekeeper n'accepte pas directement le jeton hCaptcha dans
 * createAccount. Il faut d'abord envoyer ce jeton à /gate, qui renvoie un
 * verificationCode dans l'URL de redirection. Ce code est ensuite transmis
 * au lexicon standard com.atproto.server.createAccount.
 *
 * redirect: "manual" est essentiel : Kelo Social récupère le code côté
 * serveur sans envoyer l'utilisateur vers bsky.app ou une autre page.
 */
async function exchangeCaptchaForVerificationCode(
  hcaptchaToken: string,
  handle: string
): Promise<string> {
  if (!hcaptchaToken) {
    throw new Error("La vérification anti-robot est requise.");
  }

  const state = randomUUID();
  const gateUrl = new URL(`${KELO_PDS_URL}/gate`);
  gateUrl.searchParams.set("handle", handle);
  gateUrl.searchParams.set("state", state);

  const form = new URLSearchParams();
  form.set("h-captcha-response", hcaptchaToken);

  const response = await fetch(gateUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/json",
    },
    body: form,
    redirect: "manual",
    cache: "no-store",
  });

  const location = response.headers.get("location");

  if (!location) {
    const detail = await response.text().catch(() => "");
    console.error("PDS gatekeeper verification failed:", response.status, detail);
    throw new Error(
      "La vérification anti-robot du PDS n'a pas pu être finalisée. Veuillez recommencer le captcha."
    );
  }

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(location, KELO_PDS_URL);
  } catch {
    throw new Error("Le PDS a retourné une réponse de vérification invalide.");
  }

  const returnedState = redirectUrl.searchParams.get("state");
  const verificationCode = redirectUrl.searchParams.get("code");

  if (returnedState !== state || !verificationCode) {
    throw new Error(
      "La vérification anti-robot du PDS a échoué. Veuillez recommencer le captcha."
    );
  }

  return verificationCode;
}

function mapRegistrationError(error: unknown): { message: string; status: number } {
  const candidate = error as {
    status?: number;
    error?: string;
    message?: string;
  };

  const message =
    candidate?.message ||
    (error instanceof Error ? error.message : "Erreur lors de la création du compte.");

  if (/handle.*taken|already.*handle/i.test(message)) {
    return { message: "Ce nom d'utilisateur est déjà utilisé.", status: 409 };
  }
  if (/email.*taken|already.*email/i.test(message)) {
    return { message: "Cette adresse e-mail est déjà utilisée.", status: 409 };
  }
  if (/verification|captcha|invalidtoken|expiredtoken/i.test(message)) {
    return {
      message: "La vérification anti-robot a expiré ou a échoué. Veuillez refaire le captcha.",
      status: 400,
    };
  }
  if (/password/i.test(message)) {
    return { message, status: 400 };
  }

  return {
    message,
    status:
      typeof candidate?.status === "number" && candidate.status >= 400 && candidate.status < 500
        ? candidate.status
        : 500,
  };
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
      return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const birthdayPassed =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!birthdayPassed) age -= 1;

    if (age < 18) {
      return NextResponse.json(
        { error: "Vous devez avoir 18 ans ou plus pour vous inscrire." },
        { status: 403 }
      );
    }

    const fullHandle = handle.includes(".") ? handle : `${handle}.kelosocial.eu`;
    const requirements = await getPdsSignupRequirements();

    let verificationCode: string | undefined;

    if (requirements.verificationRequired) {
      // Important : ne pas appeler hCaptcha siteverify ici avant Gatekeeper.
      // Le jeton hCaptcha est à usage unique et doit être consommé par /gate.
      verificationCode = await exchangeCaptchaForVerificationCode(
        hcaptchaToken,
        fullHandle
      );
    } else if (!(await verifyCaptcha(hcaptchaToken))) {
      return NextResponse.json(
        { error: "La vérification anti-robot a échoué. Veuillez réessayer." },
        { status: 400 }
      );
    }

    const inviteCode = requirements.inviteCodeRequired
      ? await createInviteCode()
      : undefined;

    const agent = new AtpAgent({ service: KELO_PDS_URL });

    await agent.createAccount({
      email,
      handle: fullHandle,
      password,
      ...(inviteCode ? { inviteCode } : {}),
      ...(verificationCode ? { verificationCode } : {}),
    });

    return NextResponse.json({
      success: true,
      handle: fullHandle,
      pdsUrl: KELO_PDS_URL,
    });
  } catch (error: unknown) {
    console.error("Kelo Social registration error:", error);
    const mapped = mapRegistrationError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
