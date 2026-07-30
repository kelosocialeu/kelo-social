"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { followActor, unfollowActor } from "@/lib/atproto/follow";

interface FollowButtonProps {
  did: string;
  initialFollowingUri?: string | null;
}

export default function FollowButton({ did, initialFollowingUri }: FollowButtonProps) {
  const [followingUri, setFollowingUri] = useState<string | null>(initialFollowingUri ?? null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (followingUri) {
        await unfollowActor(followingUri);
        setFollowingUri(null);
      } else {
        const uri = await followActor(did);
        setFollowingUri(uri);
      }
    } catch (err) {
      console.error(err);
      alert("Action impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={followingUri ? "secondary" : "primary"}
      onClick={handleClick}
      loading={loading}
      className="w-auto px-6"
    >
      {followingUri ? "Abonné" : "Suivre"}
    </Button>
  );
}
