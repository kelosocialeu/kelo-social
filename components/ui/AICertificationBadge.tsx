"use client";

import { Bot } from "lucide-react";

export default function AICertificationBadge({ size = 18 }: { size?: number }) {
  const box = Math.max(22, size + 4);
  return (
    <span
      title="Compte IA certifié"
      aria-label="Compte IA certifié"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700"
      style={{ width: box, height: box }}
    >
      <Bot style={{ width: size, height: size }} strokeWidth={2.2} />
    </span>
  );
}
