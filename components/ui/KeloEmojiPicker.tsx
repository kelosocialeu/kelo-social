"use client";

import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] w-full items-center justify-center rounded-2xl bg-white text-sm text-kelo-muted">
      Chargement des émojis…
    </div>
  ),
});

interface KeloEmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export default function KeloEmojiPicker({
  onSelect,
  className = "",
}: KeloEmojiPickerProps) {
  return (
    <div
      className={`w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-2xl ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <EmojiPicker
        width="100%"
        height={380}
        lazyLoadEmojis
        onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
      />
    </div>
  );
}
