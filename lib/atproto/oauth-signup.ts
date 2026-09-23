"use client";

import { BrowserOAuthClient } from "@atproto/oauth-client-browser";

export const KELO_PDS_OAUTH = "https://pds.kelosocial.eu";
export const KELO_OAUTH_CLIENT_ID = "https://kelosocial.eu/oauth/client-metadata.json";
export const KELO_OAUTH_CALLBACK = "https://kelosocial.eu/signup/oauth/callback";

const metadata = {
  client_id: KELO_OAUTH_CLIENT_ID,
  client_name: "Kelo Social",
  client_uri: "https://kelosocial.eu",
  logo_uri: "https://kelosocial.sirv.com/logo.png",
  tos_uri: "https://kelosocial.eu/terms",
  policy_uri: "https://kelosocial.eu/privacy",
  redirect_uris: [KELO_OAUTH_CALLBACK] as [string],
  scope: "atproto",
  grant_types: ["authorization_code", "refresh_token"] as ["authorization_code", "refresh_token"],
  response_types: ["code"] as ["code"],
  token_endpoint_auth_method: "none" as const,
  application_type: "web" as const,
  dpop_bound_access_tokens: true,
};

let client: BrowserOAuthClient | null = null;

export function getKeloOAuthClient() {
  if (!client) {
    client = new BrowserOAuthClient({
      clientMetadata: metadata,
      handleResolver: KELO_PDS_OAUTH,
      responseMode: "query",
    });
  }
  return client;
}

export async function startKeloPdsSignup() {
  sessionStorage.setItem("kelo-oauth-return", "/login");
  await getKeloOAuthClient().signIn(KELO_PDS_OAUTH, {
    state: "kelo-signup",
    scope: "atproto",
    ui_locales: "fr en",
  });
}

export async function finishKeloPdsSignup() {
  return getKeloOAuthClient().init();
}
