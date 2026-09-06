import { NextResponse } from "next/server";

const APP_LOGO_URL = "https://kelosocial.sirv.com/logo.png";

export async function GET() {
  try {
    const response = await fetch(APP_LOGO_URL, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return new NextResponse("Logo unavailable", { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Logo unavailable", { status: 502 });
  }
}
