"use client";

import { useEffect, useState } from "react";

import Avatar from "@/components/feed/Avatar";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { getActorProfile } from "@/lib/atproto/profile";

interface CurrentUserAvatarProps {
  size?: "sm" | "md" | "lg";
}

export default function CurrentUserAvatar({
  size = "md",
}: CurrentUserAvatarProps) {
  const { handle } = useAuthContext();
  const [avatar, setAvatar] =
    useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    if (!handle) {
      setAvatar(undefined);
      return;
    }

    getActorProfile(handle)
      .then((profile) => {
        if (!cancelled) {
          setAvatar(profile?.avatar || undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvatar(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

  return (
    <Avatar
      src={avatar}
      fallback={(handle || "K")[0].toUpperCase()}
      gradient={!avatar}
      size={size}
    />
  );
}
