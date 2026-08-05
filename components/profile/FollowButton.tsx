"use client";

import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";

import {
  followActor,
  unfollowActor,
} from "@/lib/atproto/follow";

interface FollowButtonProps {
  did: string;
  initialFollowingUri?: string | null;
}

export default function FollowButton({
  did,
  initialFollowingUri,
}: FollowButtonProps) {
  const [followingUri, setFollowingUri] =
    useState<string | null>(
      initialFollowingUri || null
    );

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    setFollowingUri(
      initialFollowingUri || null
    );
  }, [initialFollowingUri, did]);

  const handleClick = async () => {
    if (loading) {
      return;
    }

    const previousFollowingUri =
      followingUri;

    setLoading(true);

    /*
     * Mise à jour optimiste :
     * le bouton réagit immédiatement.
     */
    if (previousFollowingUri) {
      setFollowingUri(null);
    }

    try {
      if (previousFollowingUri) {
        await unfollowActor(
          previousFollowingUri
        );
      } else {
        const createdFollowUri =
          await followActor(did);

        setFollowingUri(
          createdFollowUri
        );
      }
    } catch (error) {
      console.error(
        "Impossible de modifier l’abonnement :",
        error
      );

      setFollowingUri(
        previousFollowingUri
      );

      alert(
        "Impossible de modifier cet abonnement pour le moment."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={
        followingUri
          ? "secondary"
          : "primary"
      }
      onClick={handleClick}
      loading={loading}
      loadingText="Mise à jour..."
      className="w-auto px-6"
    >
      {followingUri
        ? "Abonné"
        : "Suivre"}
    </Button>
  );
}
