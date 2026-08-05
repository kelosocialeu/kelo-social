"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getStoredSession,
  logout as logoutService,
} from "@/services/auth.service";

import type { AtpSession } from "@/types/auth";

interface AuthContextValue {
  session: AtpSession | null;
  checked: boolean;
  handle: string;
  did: string;
  refreshSession: () => void;
  logout: () => void;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] =
    useState<AtpSession | null>(null);

  const [checked, setChecked] =
    useState(false);

  const refreshSession = () => {
    const storedSession =
      getStoredSession();

    setSession(storedSession);
    setChecked(true);
  };

  const logout = () => {
    logoutService();
    setSession(null);
    setChecked(true);
  };

  useEffect(() => {
    refreshSession();

    const handleStorage = () => {
      refreshSession();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "kelo-session-changed",
      handleStorage as EventListener
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "kelo-session-changed",
        handleStorage as EventListener
      );
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      checked,
      handle: session?.handle || "",
      did: session?.did || "",
      refreshSession,
      logout,
    }),
    [session, checked]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext doit être utilisé dans AuthProvider."
    );
  }

  return context;
}
