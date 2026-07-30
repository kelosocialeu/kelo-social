"use client";

import Link from "next/link";
import { segmentPostText } from "@/lib/atproto/rich-text";

interface PostTextProps {
  text: string;
  facets?: any[];
}

export default function PostText({ text, facets }: PostTextProps) {
  const segments = segmentPostText(text, facets);

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kelo-text">
      {segments.map((seg, i) => {
        if (seg.type === "mention") {
          return (
            <Link
              key={i}
              href={`/profile/${seg.text.replace(/^@/, "")}`}
              onClick={(e) => e.stopPropagation()}
              className="text-kelo-primary hover:underline"
            >
              {seg.text}
            </Link>
          );
        }
        if (seg.type === "link") {
          return (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-kelo-primary hover:underline"
            >
              {seg.text}
            </a>
          );
        }
        if (seg.type === "tag") {
          return (
            <span key={i} className="text-kelo-primary">
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </p>
  );
}
