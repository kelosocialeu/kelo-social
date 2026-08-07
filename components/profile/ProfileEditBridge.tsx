"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { getActorProfile } from "@/lib/atproto/profile";

export default function ProfileEditBridge() {
  const pathname = usePathname();
  const { handle, checked } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const profileHandle = pathname.startsWith("/profile/")
    ? decodeURIComponent(pathname.slice("/profile/".length).split("/")[0] || "")
    : "";

  const isOwnProfile =
    checked &&
    Boolean(handle) &&
    profileHandle.toLowerCase() === handle.toLowerCase();

  useEffect(() => {
    if (!isOwnProfile) {
      setOpen(false);
      setProfile(null);
      return;
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");

      if (!button || button.textContent?.trim() !== "Modifier le profil") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void (async () => {
        try {
          const actor = await getActorProfile(handle);
          setProfile(actor);
          setOpen(true);
        } catch (error) {
          console.error("Impossible de charger le profil à modifier :", error);
          setProfile({ handle });
          setOpen(true);
        }
      })();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [handle, isOwnProfile]);

  if (!isOwnProfile) return null;

  return (
    <EditProfileModal
      open={open}
      profile={profile}
      onClose={() => setOpen(false)}
      onSaved={() => {
        setOpen(false);
        window.location.reload();
      }}
    />
  );
}
