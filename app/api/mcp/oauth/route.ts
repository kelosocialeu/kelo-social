import { NextResponse } from "next/server";
import { authorizationServerMetadata } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizationRedirect(request: Request, source: URL) {
  const target = new URL("/api/mcp/oauth/authorize", request.url);
  for (const [key, value] of source.searchParams) {
    target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target, 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Backwards-compatibility: some MCP clients may have cached the issuer
  // itself as the authorization endpoint. If an authorization request is
  // received here, send it to the real authorization endpoint instead of
  // returning a generic 405/metadata response.
  if (
    url.searchParams.has("client_id") &&
    url.searchParams.has("redirect_uri") &&
    url.searchParams.has("response_type")
  ) {
    return authorizationRedirect(request, url);
  }

  return NextResponse.json(authorizationServerMetadata(request), {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function POST(request: Request) {
  // OAuth authorization requests can be submitted as
  // application/x-www-form-urlencoded. Accept that form at the issuer
  // endpoint too, then redirect the browser to the real authorization page.
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Requête OAuth invalide." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const target = new URL("/api/mcp/oauth/authorize", request.url);
  for (const [key, value] of form.entries()) {
    target.searchParams.set(key, String(value));
  }

  return NextResponse.redirect(target, 303);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}
