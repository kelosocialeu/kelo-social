"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Languages, MoreHorizontal, Heart } from "lucide-react";
import { addConversationReaction, removeConversationReaction } from "@/lib/atproto/chat";
import { getKeloContentPreferences, resolvedInterfaceLanguage } from "@/lib/kelo-language-preferences";
import { translateKeloText } from "@/lib/kelo-browser-translate";

export default function MessageActionMenu({
  convoId,
  message,
  myDid,
  onMessageUpdated,
  onReport,
}: {
  convoId: string;
  message: any;
  myDid?: string | null;
  onMessageUpdated?: (message: any) => void;
  onReport?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [translated, setTranslated] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const reactions = Array.isArray(message?.reactions) ? message.reactions : [];
  const myLike = reactions.find(
    (reaction: any) => reaction?.value === "❤️" && reaction?.sender?.did === myDid
  );

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => clearLongPress, []);

  const startLongPress = () => {
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setOpen(true);
    }, 500);
  };

  const endLongPress = () => {
    clearLongPress();
  };

  const toggleLike = async () => {
    if (working || !message?.id) return;
    setWorking(true);
    try {
      const updated = myLike
        ? await removeConversationReaction(convoId, message.id, "❤️")
        : await addConversationReaction(convoId, message.id, "❤️");
      onMessageUpdated?.(updated);
      setOpen(false);
    } finally {
      setWorking(false);
    }
  };

  const translate = async () => {
    if (translationLoading || !message?.text?.trim()) return;
    setTranslationLoading(true);
    try {
      const target = resolvedInterfaceLanguage(
        getKeloContentPreferences().interfaceLanguage
      );
      const result = await translateKeloText(message.text, target);
      setTranslated(result.translation);
      setOpen(false);
    } catch {
      setTranslated("Traduction indisponible pour le moment.");
    } finally {
      setTranslationLoading(false);
    }
  };

  return (
    <div
      className="relative flex shrink-0 items-center"
      onPointerDown={startLongPress}
      onPointerUp={endLongPress}
      onPointerCancel={endLongPress}
      onPointerLeave={endLongPress}
      onContextMenu={(event) => {
        event.preventDefault();
        setOpen(true);
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (longPressTriggered.current) {
            longPressTriggered.current = false;
            return;
          }
          setOpen((value) => !value);
        }}
        className="hidden h-8 w-8 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-primary [@media(hover:hover)]:flex"
        aria-label="Options du message"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-kelo-border bg-white p-1.5 shadow-xl"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={translate}
            disabled={translationLoading}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-kelo-text hover:bg-kelo-background disabled:opacity-50"
          >
            <Languages className="h-4 w-4 text-kelo-primary" />
            {translationLoading ? "Traduction…" : "Traduire"}
          </button>
          <button
            type="button"
            onClick={toggleLike}
            disabled={working}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-kelo-text hover:bg-kelo-background disabled:opacity-50"
          >
            <Heart className={`h-4 w-4 ${myLike ? "fill-current text-red-500" : "text-kelo-primary"}`} />
            {myLike ? "Retirer la réaction" : "Réagir"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReport?.();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-kelo-text hover:bg-kelo-background"
          >
            <Flag className="h-4 w-4 text-kelo-danger" />
            Signaler
          </button>
        </div>
      )}

      {translated && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[80vw] rounded-2xl border border-kelo-border bg-white p-3 text-sm leading-relaxed text-kelo-text shadow-xl">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-kelo-muted">
            Traduction
          </div>
          {translated}
        </div>
      )}
    </div>
  );
}
