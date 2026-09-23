"use client";

import { useMemo, useState } from "react";
import { Heart, Plus } from "lucide-react";
import KeloEmojiPicker from "@/components/ui/KeloEmojiPicker";
import { addConversationReaction, removeConversationReaction } from "@/lib/atproto/chat";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export default function MessageReactions({
  convoId,
  message,
  myDid,
  onMessageUpdated,
}: {
  convoId: string;
  message: any;
  myDid?: string | null;
  onMessageUpdated?: (message: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const reactions = Array.isArray(message?.reactions) ? message.reactions : [];
  const grouped = useMemo(() => {
    const map = new Map<string, { value: string; count: number; mine: boolean }>();
    for (const reaction of reactions) {
      const value = reaction?.value;
      if (!value) continue;
      const current = map.get(value) || { value, count: 0, mine: false };
      current.count += 1;
      if (reaction?.sender?.did === myDid) current.mine = true;
      map.set(value, current);
    }
    return Array.from(map.values());
  }, [reactions, myDid]);

  const toggle = async (value: string) => {
    if (working || !message?.id) return;
    setWorking(true);
    try {
      const existing = reactions.some(
        (reaction: any) =>
          reaction?.value === value && reaction?.sender?.did === myDid
      );
      const updated = existing
        ? await removeConversationReaction(convoId, message.id, value)
        : await addConversationReaction(convoId, message.id, value);
      onMessageUpdated?.(updated);
    } finally {
      setWorking(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative mt-1 flex max-w-full flex-wrap items-center gap-1">
      {grouped.map((reaction) => (
        <button
          key={reaction.value}
          type="button"
          disabled={working}
          onClick={() => toggle(reaction.value)}
          className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs transition ${reaction.mine ? "border-kelo-primary bg-kelo-primary/10" : "border-kelo-border bg-white/80"}`}
          title={reaction.mine ? "Retirer la réaction" : "Ajouter la réaction"}
        >
          <span>{reaction.value}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
      <button
        type="button"
        disabled={working}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-kelo-border bg-white/80 text-kelo-muted hover:bg-kelo-background"
        aria-label="Ajouter une réaction"
      >
        {grouped.length ? <Plus className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2">
          <div className="mb-1 flex gap-1 rounded-full border border-kelo-border bg-white p-1 shadow-lg">
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => toggle(emoji)} className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-kelo-background">
                {emoji}
              </button>
            ))}
          </div>
          <KeloEmojiPicker onSelect={toggle} />
        </div>
      )}
    </div>
  );
}
