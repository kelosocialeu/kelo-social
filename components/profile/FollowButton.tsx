"use client";

import {
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/Button";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import {
  useIdentityVerification,
} from "@/hooks/useIdentityVerification";
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

  const {
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  useEffect(() => {
    setFollowingUri(
      initialFollowingUri || null
    );
  }, [initialFollowingUri, did]);

  const handleClick = async () => {
    if (loading) return;

    if (!requireVerification()) {
      return;
    }

    const previousFollowingUri =
      followingUri;

    setLoading(true);

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
        error instanceof Error
          ? error.message
          : "Impossible de modifier cet abonnement pour le moment."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        title={
          verified
            ? undefined
            : "Vérification requise"
        }
      >
        {followingUri
          ? "Abonné"
          : "Suivre"}
      </Button>

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </>
  );
}
