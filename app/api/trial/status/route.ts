import { NextResponse } from "next/server";

const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

interface PlcAuditEntry {
  createdAt?: string;
  nullified?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const did = (searchParams.get("did") || "").trim();

  if (!did.startsWith("did:plc:")) {
    return NextResponse.json({
      active: false,
      reason: "unsupported_did",
    });
  }

  try {
    const response = await fetch(
      `https://plc.directory/${encodeURIComponent(did)}/log/audit`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { active: false, reason: "plc_unavailable" },
        { status: 200 }
      );
    }

    const audit = (await response.json()) as PlcAuditEntry[];
    const timestamps = audit
      .map((entry) => entry.createdAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value));

    if (!timestamps.length) {
      return NextResponse.json({ active: false, reason: "creation_unknown" });
    }

    const createdAtMs = Math.min(...timestamps);
    const expiresAtMs = createdAtMs + TRIAL_DURATION_MS;
    const now = Date.now();

    return NextResponse.json({
      active: now < expiresAtMs,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      remainingMs: Math.max(0, expiresAtMs - now),
    });
  } catch (error) {
    console.error("Unable to determine Kelo Social trial status:", error);
    return NextResponse.json({ active: false, reason: "trial_check_failed" });
  }
}
