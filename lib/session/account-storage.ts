import type { AtpSession } from "@/types/auth";

const ACCOUNTS_KEY = "kelo.accounts";
const ACTIVE_SESSION_KEY = "kelo.session";
const SESSION_CHANGED_EVENT = "kelo-session-changed";

function isValidSession(value: unknown): value is AtpSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AtpSession>;
  return Boolean(
    session.accessJwt &&
      session.refreshJwt &&
      session.handle &&
      session.did &&
      session.pdsUrl
  );
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function notifySessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

function writeActiveSession(session: AtpSession) {
  window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem("accessJwt", session.accessJwt);
  window.localStorage.setItem("refreshJwt", session.refreshJwt);
  window.localStorage.setItem("userHandle", session.handle);
  window.localStorage.setItem("userDid", session.did);
  window.localStorage.setItem("pdsService", session.pdsUrl);
}

export function getSavedAccounts(): AtpSession[] {
  if (typeof window === "undefined") return [];
  const stored = readJson<unknown[]>(ACCOUNTS_KEY);
  const accounts = Array.isArray(stored) ? stored.filter(isValidSession) : [];
  const active = readJson<unknown>(ACTIVE_SESSION_KEY);

  if (isValidSession(active) && !accounts.some((account) => account.did === active.did)) {
    accounts.unshift(active);
  }

  return accounts;
}

export function rememberAccount(session: AtpSession) {
  if (typeof window === "undefined") return;
  const accounts = getSavedAccounts();
  const next = [session, ...accounts.filter((account) => account.did !== session.did)];
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}

export function syncActiveAccount() {
  if (typeof window === "undefined") return;
  const active = readJson<unknown>(ACTIVE_SESSION_KEY);
  if (isValidSession(active)) rememberAccount(active);
}

export function switchSavedAccount(did: string): boolean {
  if (typeof window === "undefined") return false;
  const account = getSavedAccounts().find((item) => item.did === did);
  if (!account) return false;

  rememberAccount(account);
  writeActiveSession(account);
  notifySessionChanged();
  return true;
}

export function removeSavedAccount(did: string): AtpSession[] {
  if (typeof window === "undefined") return [];
  const next = getSavedAccounts().filter((account) => account.did !== did);
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  return next;
}
