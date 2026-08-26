"use client";

import { Bot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ActorLike = {
  did?: string;
  handle?: string;
  labels?: unknown;
  [key: string]: unknown;
};

function hasLocalRobotLabel(labels: unknown) {
  if (!Array.isArray(labels)) return false;
  return labels.some((label) => {
    if (!label || typeof label !== "object") return false;
    const value = String((label as Record<string, unknown>).val || "").toLowerCase();
    return ["bot", "automated", "automated-account", "robot"].includes(value);
  });
}

export default function RobotAccountBadge({
  actor,
  size = 20,
}: {
  actor: ActorLike;
  size?: number;
}) {
  const localRobot = useMemo(() => hasLocalRobotLabel(actor?.labels), [actor?.labels]);
  const [robot, setRobot] = useState(localRobot);

  useEffect(() => {
    setRobot(localRobot);
    const did = typeof actor?.did === "string" ? actor.did : "";
    const handle = typeof actor?.handle === "string" ? actor.handle : "";
    if (!did && !handle) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    if (did) params.set("did", did);
    if (handle) params.set("handle", handle);

    fetch(`/api/kelo/robot-status?${params.toString()}`, {
      cache: "force-cache",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.robot === true) setRobot(true);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [actor?.did, actor?.handle, localRobot]);

  if (!robot) return null;

  return (
    <span
      title="Compte robot / automatisé"
      aria-label="Compte robot ou automatisé"
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700"
      style={{ width: size + 6, height: size + 6 }}
    >
      <Bot style={{ width: size, height: size }} strokeWidth={2.2} />
    </span>
  );
}
