"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { likePost } from "@/lib/atproto/posts";

type FloatingHeart = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  scale: number;
  rotate: number;
};

interface ReelTapGestureLayerProps {
  post: any;
  disabled?: boolean;
  onSingleTap: () => void | Promise<void>;
  onStateChange: (patch: Record<string, unknown>) => void;
  onError?: (message: string) => void;
}

const DOUBLE_TAP_MS = 270;
const DOUBLE_TAP_DISTANCE = 90;
const SINGLE_TAP_DELAY_MS = 285;

export default function ReelTapGestureLayer({
  post,
  disabled = false,
  onSingleTap,
  onStateChange,
  onError,
}: ReelTapGestureLayerProps) {
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likeRequestRef = useRef(false);
  const heartIdRef = useRef(0);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const spawnHearts = (x: number, y: number) => {
    const created = Array.from({ length: 4 }, (_, index): FloatingHeart => ({
      id: ++heartIdRef.current,
      x: x + (index - 1.5) * 8,
      y: y + (index % 2) * 5,
      dx: (Math.random() - 0.5) * 72,
      dy: -78 - Math.random() * 82,
      scale: 0.9 + Math.random() * 0.55,
      rotate: -20 + Math.random() * 40,
    }));

    setHearts((current) => [...current, ...created]);
    window.setTimeout(() => {
      const ids = new Set(created.map((heart) => heart.id));
      setHearts((current) => current.filter((heart) => !ids.has(heart.id)));
    }, 760);
  };

  const likeOptimistically = async () => {
    if (post.viewer?.like || likeRequestRef.current) return;

    likeRequestRef.current = true;
    const previousViewer = post.viewer || {};
    const previousCount = post.likeCount || 0;

    // Le cœur et le compteur changent immédiatement : le réseau ne bloque jamais
    // l'animation du double tap.
    onStateChange({
      viewer: { ...previousViewer, like: "__kelo_pending_like__" },
      likeCount: previousCount + 1,
    });

    try {
      const likeUri = await likePost({ uri: post.uri, cid: post.cid });
      onStateChange({
        viewer: { ...previousViewer, like: likeUri },
        likeCount: previousCount + 1,
      });
    } catch (error) {
      console.error("Double tap Réels : like impossible", error);
      onStateChange({ viewer: previousViewer, likeCount: previousCount });
      onError?.("Impossible de mettre J’aime pour le moment.");
    } finally {
      likeRequestRef.current = false;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = performance.now();
    const previous = lastTapRef.current;

    const isDoubleTap =
      !!previous &&
      now - previous.time <= DOUBLE_TAP_MS &&
      Math.hypot(x - previous.x, y - previous.y) <= DOUBLE_TAP_DISTANCE;

    if (isDoubleTap) {
      lastTapRef.current = null;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }

      // L'animation part dans la même frame que le deuxième tap.
      spawnHearts(x, y);
      void likeOptimistically();
      return;
    }

    lastTapRef.current = { time: now, x, y };
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = setTimeout(() => {
      lastTapRef.current = null;
      singleTapTimerRef.current = null;
      void onSingleTap();
    }, SINGLE_TAP_DELAY_MS);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="Touchez pour lire ou mettre en pause, touchez deux fois pour aimer"
        onPointerUp={handlePointerUp}
        onContextMenu={(event) => event.preventDefault()}
        className="absolute inset-0 z-[6] select-none touch-manipulation"
        style={{ WebkitTapHighlightColor: "transparent", WebkitTouchCallout: "none" } as React.CSSProperties}
      />

      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="pointer-events-none absolute z-40 text-fuchsia-500"
          style={{
            left: heart.x,
            top: heart.y,
            transform: `translate(-50%, -50%) scale(${heart.scale}) rotate(${heart.rotate}deg)`,
            animation: "kelo-fluid-reel-heart 720ms cubic-bezier(.16,.82,.28,1) forwards",
            ["--heart-dx" as any]: `${heart.dx}px`,
            ["--heart-dy" as any]: `${heart.dy}px`,
          }}
        >
          <Heart className="h-14 w-14 drop-shadow-[0_5px_16px_rgba(0,0,0,.45)]" fill="currentColor" strokeWidth={0} />
        </div>
      ))}

      <style jsx>{`
        @keyframes kelo-fluid-reel-heart {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.35); }
          12% { opacity: 1; }
          35% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--heart-dx)), calc(-50% + var(--heart-dy))) scale(1.18);
          }
        }
      `}</style>
    </>
  );
}
