"use client";

import { useState } from "react";
import { Flag, Languages, MoreHorizontal, Heart } from "lucide-react";
import { addConversationReaction, removeConversationReaction } from "@/lib/atproto/chat";
import { getKeloContentPreferences, resolvedInterfaceLanguage } from "@/lib/kelo-language-preferences";
import { translateKeloText } from "@/lib/kelo-browser-translate";
import KeloEmojiPicker from "@/components/ui/KeloEmojiPicker";

export default function MessageActionMenu({
  convoId,
  message,
  myDid,
  onMessageUpdated,
  onReport,
  open: controlledOpen,
  onOpenChange,
  align = "right",
}: {
  convoId: string;
  message: any;
  myDid?: string | null;
  onMessageUpdated?: (message: any) => void;
  onReport?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "left" | "right";
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [working, setWorking] = useState(false);
  const [translated, setTranslated] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const reactions = Array.isArray(message?.reactions) ? message.reactions : [];
  const myLike = reactions.find(
    (reaction: any) =>
      reaction?.value === "❤️" && reaction?.sender?.did === myDid
  );
  const toggleReaction = async (emoji: string) => {
    if (working || !message?.id || !emoji.trim()) return;
    const value = emoji.trim();
    const currentReactions = Array.isArray(message?.reactions) ? message.reactions : [];
    const mine = currentReactions.find(
      (reaction: any) =>
        reaction?.value === value && reaction?.sender?.did === myDid
    );
    setWorking(true);
    try {
      const updated = mine
        ? await removeConversationReaction(convoId, message.id, value)
        : await addConversationReaction(convoId, message.id, value);
      onMessageUpdated?.(updated);
      setReactionPickerOpen(false);
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
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="hidden h-8 w-8 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-primary [@media(hover:hover)]:flex"
        aria-label="Options du message"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`absolute z-50 top-full mt-2 w-44 max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-kelo-border bg-white p-1.5 shadow-xl ${align === "left" ? "right-0" : "left-0"}`}
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
            onClick={() => setReactionPickerOpen((value) => !value)}
            disabled={working}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-kelo-text hover:bg-kelo-background disabled:opacity-50"
          >
            <Heart className={`h-4 w-4 ${myLike ? "fill-current text-red-500" : "text-kelo-primary"}`} />
            Réagir
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

      {reactionPickerOpen && (
        <div className={`absolute top-full z-[60] mt-2 ${align === "left" ? "right-0" : "left-0"}`}>
          <KeloEmojiPicker onSelect={(emoji) => void toggleReaction(emoji)} />
        </div>
      )}

      {translated && (
        <div className={`absolute top-full z-40 mt-2 w-64 max-w-[calc(100vw-32px)] rounded-2xl border border-kelo-border bg-white p-3 text-sm leading-relaxed text-kelo-text shadow-xl ${align === "left" ? "right-0" : "left-0"}`}>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-kelo-muted">
            Traduction
          </div>
          {translated}
        </div>
      )}
    </div>
  );
}
