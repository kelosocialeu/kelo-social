"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";

/**
 * "/profile" est un raccourci vers votre propre profil : on redirige vers
 * la route dynamique /profile/[handle] dès que la session est confirmée.
 */
export default function MyProfileRedirect() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (checked && handle) {
      router.replace(`/profile/${handle}`);
    }
  }, [checked, handle, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
      Redirection vers votre profil...
    </div>
  );
}
