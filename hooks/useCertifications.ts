"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listCertifications,
  CertificationRecord,
  CertificationStatus,
} from "@/lib/atproto/certifications";

const STORAGE_KEY = "kelo.certifications.cache.v1";
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

type PersistedCertification = [string, CertificationStatus];

function readPersistedCertifications(): Map<string, CertificationStatus> {
  if (typeof window === "undefined") return new Map();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as PersistedCertification[];
    return new Map(parsed);
  } catch {
    return new Map();
  }
}

function persistCertifications(map: Map<string, CertificationStatus>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(map.entries()))
    );
  } catch {
    // Le cache local est uniquement un filet de sécurité en cas de panne.
  }
}

export function useCertifications() {
  const [byHandle, setByHandle] = useState<Map<string, CertificationStatus>>(
    () => new Map()
  );
  const [loaded, setLoaded] = useState(false);
  const currentRef = useRef<Map<string, CertificationStatus>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const records: CertificationRecord[] = await listCertifications();
      const map = new Map<string, CertificationStatus>();

      records.forEach((record) => {
        map.set(record.subjectHandle.toLowerCase(), record.status);
      });

      currentRef.current = map;
      setByHandle(map);
      persistCertifications(map);
    } catch (error) {
      console.warn(
        "Certifications temporairement indisponibles, dernier état conservé :",
        error
      );

      if (currentRef.current.size === 0) {
        const persisted = readPersistedCertifications();
        currentRef.current = persisted;
        setByHandle(persisted);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const persisted = readPersistedCertifications();

    if (persisted.size > 0) {
      currentRef.current = persisted;
      setByHandle(persisted);
      setLoaded(true);
    }

    void refresh();

    const runWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const interval = window.setInterval(runWhenVisible, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", runWhenVisible);
    document.addEventListener("visibilitychange", runWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runWhenVisible);
      document.removeEventListener("visibilitychange", runWhenVisible);
    };
  }, [refresh]);

  const getStatus = (handle?: string): CertificationStatus | null => {
    if (!handle) return null;
    return byHandle.get(handle.toLowerCase()) ?? null;
  };

  return { getStatus, loaded, refresh };
}
