import { NextResponse } from 'next/server';
import { AtpAgent } from '@atproto/api';

export async function POST(request: Request) {
  try {
    const { handle, email, password, birthDate, hcaptchaToken, pdsUrl } = await request.json();

    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 18) {
      return NextResponse.json({ error: "Vous devez avoir 18 ans ou plus pour vous inscrire." }, { status: 403 });
    }

    const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
    if (!hcaptchaSecret) {
       return NextResponse.json({ error: "Configuration hCaptcha manquante sur le serveur." }, { status: 500 });
    }

    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${hcaptchaSecret}&response=${hcaptchaToken}`
    });
    const hcaptchaData = await verifyRes.json();
    
    if (!hcaptchaData.success) {
      return NextResponse.json({ error: "La vérification anti-robot a échoué. Veuillez réessayer." }, { status: 400 });
    }

    const adminPassword = process.env.PDS_ADMIN_PASSWORD;
    const inviteRes = await fetch(`${pdsUrl}/xrpc/com.atproto.server.createInviteCode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`admin:${adminPassword}`).toString('base64')}`
      },
      body: JSON.stringify({ useCount: 1 })
    });

    if (!inviteRes.ok) {
      throw new Error("Impossible de générer le code d'invitation sur le PDS.");
    }
    const inviteData = await inviteRes.json();
    const inviteCode = inviteData.code;

    const agent = new AtpAgent({ service: pdsUrl });
    const fullHandle = handle.includes('.') ? handle : `${handle}.kelosocial.eu`;
    
    await agent.createAccount({
      email: email,
      handle: fullHandle,
      password: password,
      inviteCode: inviteCode
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la création du compte." }, { status: 500 });
  }
}
