import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    client_id: "https://kelosocial.eu/oauth-client-metadata.json",
    client_name: "Kelo Social",
    client_uri: "https://kelosocial.eu",
    logo_uri: "https://kelosocial.sirv.com/logo.png",
    tos_uri: "https://kelosocial.eu/terms",
    policy_uri: "https://kelosocial.eu/privacy",
    redirect_uris: ["https://kelosocial.eu/signup/oauth/callback"],
    scope: "atproto",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true,
  });
}
