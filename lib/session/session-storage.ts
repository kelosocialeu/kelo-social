import { AtpSession } from "@/types/auth";

const STORAGE_KEY = "kelo.session";
const ACCOUNTS_KEY = "kelo.accounts";
const SESSION_CHANGED_EVENT =
  "kelo-session-changed";

function notifySessionChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SESSION_CHANGED_EVENT)
  );
}

function getStoredAccounts(): AtpSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as AtpSession[]) : [];
  } catch {
    return [];
  }
}

function rememberAccount(session: AtpSession): void {
  if (typeof window === "undefined") return;
  const accounts = getStoredAccounts();
  const next = [session, ...accounts.filter((account) => account?.did && account.did !== session.did)];
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}

/**
 * Abstraction de stockage de session.
 *
 * ⚠️ SÉCURITÉ — Le localStorage utilisé ici est une solution TEMPORAIRE,
 * vulnérable au XSS. Il ne doit jamais être considéré comme définitif.
 *
 * Migration prévue : cookies HttpOnly + Secure posés côté serveur via
 * une route API Next.js (ex. /api/session). Le jour venu, seule
 * l'implémentation de cette classe change — aucun appelant
 * (services/, hooks/) n'aura à être modifié, car tout passe par
 * l'interface SessionStorage ci-dessous.
 */
export interface SessionStorage {
  get(): AtpSession | null;
  set(session: AtpSession): void;
  clear(): void;
}

class LocalStorageSessionStorage
  implements SessionStorage
{
  get(): AtpSession | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      return raw
        ? (JSON.parse(raw) as AtpSession)
        : null;
    } catch {
      return null;
    }
  }

  set(session: AtpSession): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(session)
    );

    rememberAccount(session);

    // Compatibilité TEMPORAIRE avec les pages pas encore migrées
    // (feed, profile, admin) qui lisent encore ces clés individuelles.
    // À supprimer une fois toutes les pages migrées vers AuthProvider.
    window.localStorage.setItem(
      "accessJwt",
      session.accessJwt
    );
    window.localStorage.setItem(
      "refreshJwt",
      session.refreshJwt
    );
    window.localStorage.setItem(
      "userHandle",
      session.handle
    );
    window.localStorage.setItem(
      "userDid",
      session.did
    );
    window.localStorage.setItem(
      "pdsService",
      session.pdsUrl
    );

    /*
     * L'événement storage n'est pas envoyé dans l'onglet qui effectue
     * lui-même la modification. Cet événement personnalisé permet donc
     * à AuthProvider de récupérer immédiatement la nouvelle session avant
     * que la page protégée ne décide de rediriger vers /login.
     */
    notifySessionChanged();
  }

  clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(
      STORAGE_KEY
    );
    window.localStorage.removeItem(
      ACCOUNTS_KEY
    );

    [
      "accessJwt",
      "refreshJwt",
      "userHandle",
      "userDid",
      "pdsService",
    ].forEach((key) =>
      window.localStorage.removeItem(key)
    );

    notifySessionChanged();
  }
}

export const sessionStorage: SessionStorage =
  new LocalStorageSessionStorage();
