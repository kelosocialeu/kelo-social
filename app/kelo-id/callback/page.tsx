import { Suspense } from "react";

import AuthLayout from "@/components/layout/AuthLayout";
import KeloIdCallbackClient from "@/components/auth/KeloIdCallbackClient";

export default function KeloIdCallbackPage() {
  return (
    <AuthLayout
      title="Connexion Kelo ID"
      tagline="Votre identité et votre session AT Protocol sont vérifiées avant l’ouverture du feed."
    >
      <Suspense
        fallback={
          <p className="text-center text-sm font-medium text-kelo-muted">
            Finalisation de la connexion Kelo ID...
          </p>
        }
      >
        <KeloIdCallbackClient />
      </Suspense>
    </AuthLayout>
  );
}
