import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5000;

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      parts[0] >= 224
    );
  }

  if (net.isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return true;
}

async function validatePublicUrl(value: string): Promise<URL> {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Protocole non autorisé");
  }

  if (url.username || url.password) {
    throw new Error("Identifiants interdits dans l’URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Hôte local interdit");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Adresse privée interdite");
    return url;
  }

  const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!resolved.length || resolved.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Adresse non publique");
  }

  return url;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(html: string, names: string[]): string {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtml(match[1]);
    }
  }
  return "";
}

function getTitle(html: string): string {
  const meta = getMeta(html, ["og:title", "twitter:title"]);
  if (meta) return meta;
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

async function fetchHtml(startUrl: URL) {
  let current = startUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    current = await validatePublicUrl(current.toString());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "KeloSocial-LinkPreview/1.0",
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === MAX_REDIRECTS) throw new Error("Trop de redirections");
        current = new URL(location, current);
        continue;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new Error("Contenu non HTML");
      }

      const reader = response.body?.getReader();
      if (!reader) return { html: "", url: current };

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) break;
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
      return { html: buffer.toString("utf8"), url: current };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Redirection impossible");
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")?.trim();
  if (!raw) return NextResponse.json({ error: "URL manquante" }, { status: 400 });

  try {
    const initial = await validatePublicUrl(raw);
    const { html, url } = await fetchHtml(initial);
    const title = getTitle(html).slice(0, 300) || url.hostname.replace(/^www\./, "");
    const description = getMeta(html, ["og:description", "twitter:description", "description"]).slice(0, 1000);
    const image = getMeta(html, ["og:image", "twitter:image"]);

    let imageUrl = "";
    if (image) {
      try {
        imageUrl = new URL(image, url).toString();
      } catch {}
    }

    return NextResponse.json(
      {
        uri: url.toString(),
        title,
        description,
        image: imageUrl,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.warn("Aperçu de lien indisponible :", error);
    return NextResponse.json({ error: "Aperçu indisponible" }, { status: 422 });
  }
}
