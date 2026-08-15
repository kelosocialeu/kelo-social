"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import {
  useIdentityVerification,
} from "@/hooks/useIdentityVerification";
import {
  followActor,
  unfollowActor,
} from "@/lib/atproto/follow";
import {
  getConversationAvailability,
  getOrCreateConversation,
} from "@/lib/atproto/chat";

interface FollowButtonProps {
  did: string;
  initialFollowingUri?: string | null;
}

export default function FollowButton({
  did,
  initialFollowingUri,
}: FollowButtonProps) {
  const router = useRouter();
  const [followingUri, setFollowingUri] =
    useState<string | null>(
      initialFollowingUri || null
    );
  const [loading, setLoading] =
    useState(false);
  const [canMessage, setCanMessage] = useState(false);
  const [checkingMessages, setCheckingMessages] = useState(true);
  const [openingMessage, setOpeningMessage] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setCheckingMessages(true);

    getConversationAvailability(did)
      .then(({ canChat }) => {
        if (!cancelled) setCanMessage(canChat);
      })
      .catch(() => {
        if (!cancelled) setCanMessage(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [did]);

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

  const handleMessage = async () => {
    if (openingMessage || !canMessage) return;
    if (!requireVerification()) return;

    setOpeningMessage(true);
    try {
      const availability = await getConversationAvailability(did);
      if (!availability.canChat) {
        setCanMessage(false);
        return;
      }

      if (availability.convo?.id) {
        router.push(`/messages/${availability.convo.id}`);
        return;
      }

      const conversation = await getOrCreateConversation(did);
      router.push(`/messages/${conversation.id}`);
    } catch (error) {
      console.error("Impossible d’ouvrir la messagerie :", error);
      alert("Cette personne n’accepte pas actuellement de nouveaux messages privés.");
    } finally {
      setOpeningMessage(false);
    }
  };

  return (
    <>
      {!checkingMessages && canMessage && (
        <Button
          type="button"
          variant="secondary"
          onClick={handleMessage}
          loading={openingMessage}
          loadingText="Ouverture..."
          className="w-auto px-4"
          title="Envoyer un message privé"
        >
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Message
          </span>
        </Button>
      )}

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
