"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import AuthLayout from "@/components/layout/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { loginWithKeloIdSession } from "@/services/auth.service";
import type { AtpSession } from "@/types/auth";

interface LoginChallenge {
  id: string;
  clientState: string;
  expiresAt: string;
  qrPayload: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession } = useAuthContext();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "kelo-id">("password");
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const pollRef = useRef<number | null>(null);

  const { login, loading, error } = useAuth();

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return stopPolling;
  }, []);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    await login({
      identifier,
      password,
    });
  };

  async function startKeloIdLogin() {
    stopPolling();
    setQrLoading(true);
    setQrMessage("");
    setChallenge(null);
    setQrDataUrl("");

    try {
      const response = await fetch("/api/kelo-id/login/qr/create", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer le QR.");
      }

      const nextChallenge: LoginChallenge = {
        id: data.id,
        clientState: data.clientState,
        expiresAt: data.expiresAt,
        qrPayload: data.qrPayload,
      };

      setChallenge(nextChallenge);
      setQrDataUrl(
        await QRCode.toDataURL(nextChallenge.qrPayload, {
          width: 280,
          margin: 1,
          errorCorrectionLevel: "M",
        })
      );
      setQrMessage(
        "Ouvrez Kelo ID sur votre téléphone et scannez ce QR. La connexion se fera automatiquement."
      );

      pollRef.current = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/kelo-id/login/qr/status?id=${encodeURIComponent(nextChallenge.id)}&clientState=${encodeURIComponent(nextChallenge.clientState)}`,
            { cache: "no-store" }
          );
          const statusData = await statusResponse.json();

          if (statusData.status === "pending") {
            return;
          }

          if (statusData.status === "expired") {
            stopPolling();
            setQrMessage("Ce QR a expiré. Générez-en un nouveau.");
            return;
          }

          if (!statusResponse.ok) {
            stopPolling();
            setQrMessage(statusData.error || "Connexion Kelo ID impossible.");
            return;
          }

          if (statusData.status === "approved" && statusData.session) {
            stopPolling();
            setQrMessage("Connexion confirmée. Ouverture de Kelo Social...");
            await loginWithKeloIdSession(statusData.session as AtpSession);
            refreshSession();
            router.replace("/feed");
          }
        } catch (pollError) {
          console.error("Kelo ID login polling error:", pollError);
        }
      }, 2_000);
    } catch (startError) {
      setQrMessage(
        startError instanceof Error
          ? startError.message
          : "Connexion Kelo ID impossible."
      );
    } finally {
      setQrLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Connexion"
      tagline="Accédez à votre espace souverain et fédéré sur l’AT Protocol."
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-kelo-background p-1">
        <button
          type="button"
          onClick={() => {
            stopPolling();
            setMode("password");
          }}
          className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
            mode === "password"
              ? "bg-white text-kelo-text shadow-sm"
              : "text-kelo-muted"
          }`}
        >
          Mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode("kelo-id")}
          className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
            mode === "kelo-id"
              ? "bg-white text-kelo-text shadow-sm"
              : "text-kelo-muted"
          }`}
        >
          QR Kelo ID
        </button>
      </div>

      {mode === "password" ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          <Input
            label="Identifiant / Handle"
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="votre-compte.exemple"
          />

          <p className="-mt-3 text-xs text-kelo-muted">
            Kelo Social détecte automatiquement le PDS associé à votre compte.
          </p>

          <Input
            label="Mot de passe"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Votre mot de passe"
          />

          <div className="-mt-3 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-kelo-primary transition hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm font-medium text-kelo-danger"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            loadingText="Connexion en cours..."
          >
            Se connecter
          </Button>
        </form>
      ) : (
        <section className="flex flex-col items-center gap-4 text-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR de connexion Kelo ID"
              className="w-full max-w-[280px] rounded-2xl border border-kelo-border bg-white p-3"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-2xl border border-dashed border-kelo-border bg-kelo-background px-6 text-sm text-kelo-muted">
              Générez un QR, puis scannez-le depuis Kelo ID sur votre téléphone.
            </div>
          )}

          {challenge && (
            <p className="text-xs text-kelo-muted">
              Valable jusqu’à {new Date(challenge.expiresAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}.
            </p>
          )}

          {qrMessage && (
            <p className="text-sm font-medium text-kelo-muted">
              {qrMessage}
            </p>
          )}

          <Button
            type="button"
            loading={qrLoading}
            loadingText="Création du QR..."
            onClick={startKeloIdLogin}
          >
            {challenge ? "Générer un nouveau QR" : "Générer le QR de connexion"}
          </Button>
        </section>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <Link
          href="/signup"
          className="w-full rounded-full bg-kelo-background py-3.5 text-center font-bold text-kelo-text transition hover:bg-kelo-border/60"
        >
          Créer un nouveau compte
        </Link>

        <div className="mt-2 flex justify-center">
          <Link
            href="/"
            className="text-sm text-kelo-muted transition-colors hover:text-kelo-text"
          >
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
