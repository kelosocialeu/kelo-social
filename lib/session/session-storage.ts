import { AtpSession } from "@/types/auth";

const STORAGE_KEY = "kelo.session";

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

class LocalStorageSessionStorage implements SessionStorage {
  get(): AtpSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AtpSession) : null;
    } catch {
      return null;
    }
  }

  set(session: AtpSession): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    // Compatibilité TEMPORAIRE avec les pages pas encore migrées
    // (feed, profile, admin) qui lisent encore ces clés individuelles.
    // À supprimer une fois toutes les pages migrées vers useAuth().
    window.localStorage.setItem("accessJwt", session.accessJwt);
    window.localStorage.setItem("refreshJwt", session.refreshJwt);
    window.localStorage.setItem("userHandle", session.handle);
    window.localStorage.setItem("userDid", session.did);
    window.localStorage.setItem("pdsService", session.pdsUrl);
  }

  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    ["accessJwt", "refreshJwt", "userHandle", "userDid", "pdsService"].forEach((key) =>
      window.localStorage.removeItem(key)
    );
  }
}

export const sessionStorage: SessionStorage = new LocalStorageSessionStorage();
