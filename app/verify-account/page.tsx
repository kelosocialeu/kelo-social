"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  CheckCircle2,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  getStoredSession,
} from "@/services/auth.service";

import {
  clearIdentityVerificationCache,
} from "@/lib/atproto/identity-verifications";

interface QrChallenge {
  id: string;
  expiresAt: string;
  qrPayload: string;
}

export default function VerifyAccountPage() {
  const router = useRouter();
  const pollRef = useRef<number | null>(null);

  const [mode, setMode] =
    useState<"code" | "qr">("code");
  const [code, setCode] = useState("");
  const [qr, setQr] =
    useState<QrChallenge | null>(null);
  const [qrImage, setQrImage] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(
          pollRef.current
        );
      }
    };
  }, []);

  function finishVerification() {
    const session = getStoredSession();

    if (session?.did) {
      clearIdentityVerificationCache(
        session.did
      );
    }

    setSuccess(true);
    setMessage(
      "Votre compte est vérifié. Toutes les fonctionnalités sont maintenant débloquées."
    );

    window.setTimeout(() => {
      router.replace("/feed");
      router.refresh();
    }, 1800);
  }

  async function submitCode(
    event: React.FormEvent
  ) {
    event.preventDefault();
    const session = getStoredSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/kelo-id/code",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            code,
            session,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Code Kelo ID invalide."
        );
      }

      finishVerification();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Validation impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkQrStatus(
    challengeId: string
  ) {
    const session = getStoredSession();

    if (!session) {
      return;
    }

    const response = await fetch(
      "/api/kelo-id/qr/status",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          id: challengeId,
          session,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        return;
      }

      throw new Error(
        data.error ||
          "Impossible de vérifier le QR."
      );
    }

    if (data.status === "approved") {
      if (pollRef.current) {
        window.clearInterval(
          pollRef.current
        );
        pollRef.current = null;
      }

      finishVerification();
    }
  }

  async function createQr() {
    const session = getStoredSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    if (pollRef.current) {
      window.clearInterval(
        pollRef.current
      );
      pollRef.current = null;
    }

    setLoading(true);
    setMessage("");
    setQr(null);
    setQrImage("");

    try {
      const response = await fetch(
        "/api/kelo-id/qr/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            session,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de créer le QR."
        );
      }

      const challenge: QrChallenge = {
        id: data.id,
        expiresAt: data.expiresAt,
        qrPayload: data.qrPayload,
      };

      setQr(challenge);
      setQrImage(
        await QRCode.toDataURL(
          challenge.qrPayload,
          {
            width: 320,
            margin: 2,
          }
        )
      );

      pollRef.current =
        window.setInterval(() => {
          checkQrStatus(
            challenge.id
          ).catch((error) => {
            setMessage(
              error instanceof Error
                ? error.message
                : "Vérification impossible."
            );
          });
        }, 2500);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Création du QR impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-kelo-background px-4 py-8 text-kelo-text sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <section className="rounded-3xl border border-kelo-border bg-white p-5 shadow-kelo sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
            Débloquer Kelo Social
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-kelo-muted sm:text-base">
            Utilisez soit le code reçu sur Kelo ID, soit le QR à scanner avec votre téléphone. Une seule méthode suffit.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-kelo-background p-1.5">
            <button
              type="button"
              onClick={() => setMode("code")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                mode === "code"
                  ? "bg-white shadow-sm"
                  : "text-kelo-muted"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Code
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("qr");
                if (!qr && !success) {
                  createQr();
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                mode === "qr"
                  ? "bg-white shadow-sm"
                  : "text-kelo-muted"
              }`}
            >
              <QrCode className="h-4 w-4" />
              QR code
            </button>
          </div>

          {success ? (
            <div className="mt-6 rounded-2xl bg-green-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <p className="mt-3 font-extrabold text-green-800">
                Compte vérifié
              </p>
              <p className="mt-1 text-sm text-green-700">
                Redirection vers Kelo Social...
              </p>
            </div>
          ) : mode === "code" ? (
            <form
              onSubmit={submitCode}
              className="mt-6"
            >
              <label
                htmlFor="kelo-id-code"
                className="text-sm font-bold"
              >
                Code Kelo ID
              </label>

              <input
                id="kelo-id-code"
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .toUpperCase()
                  )
                }
                placeholder="AB7K-X92P-KL81"
                autoCapitalize="characters"
                className="mt-2 w-full rounded-2xl border border-kelo-border bg-kelo-background px-4 py-4 text-center font-mono text-lg font-extrabold tracking-widest outline-none focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20"
              />

              <button
                type="submit"
                disabled={
                  loading || !code.trim()
                }
                className="mt-4 w-full rounded-full bg-kelo-gradient px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {loading
                  ? "Vérification..."
                  : "Valider le code"}
              </button>
            </form>
          ) : (
            <div className="mt-6 text-center">
              {qrImage ? (
                <>
                  <div className="mx-auto inline-flex rounded-3xl border border-kelo-border bg-white p-4 shadow-sm">
                    <img
                      src={qrImage}
                      alt="QR Kelo ID"
                      className="h-auto w-full max-w-[280px]"
                    />
                  </div>

                  <p className="mt-4 text-sm text-kelo-muted">
                    Ouvrez Kelo ID sur votre téléphone, scannez ce QR puis confirmez « Oui, c’est bien moi ».
                  </p>

                  <p className="mt-2 text-xs text-kelo-muted">
                    Expire à {new Date(
                      qr?.expiresAt || ""
                    ).toLocaleTimeString("fr-BE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={createQr}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loading
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  Générer le QR
                </button>
              )}
            </div>
          )}

          {message && !success && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {message}
            </p>
          )}

          <a
            href={
              process.env.NEXT_PUBLIC_KELO_ID_URL ||
              "https://keloid.eu"
            }
            target="_blank"
            rel="noreferrer"
            className="mt-6 block text-center text-sm font-bold text-kelo-primary"
          >
            Ouvrir Kelo ID
          </a>
        </section>
      </div>
    </main>
  );
}
