"use client";

import { useEffect, useState } from "react";
import { listCertifications, CertificationRecord, CertificationStatus } from "@/lib/atproto/certifications";

export function useCertifications() {
  const [byHandle, setByHandle] = useState<Map<string, CertificationStatus>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listCertifications()
      .then((records: CertificationRecord[]) => {
        const map = new Map<string, CertificationStatus>();
        records.forEach((r) => map.set(r.subjectHandle.toLowerCase(), r.status));
        setByHandle(map);
      })
      .catch((err) => console.error("Erreur de chargement des certifications :", err))
      .finally(() => setLoaded(true));
  }, []);

  const getStatus = (handle?: string): CertificationStatus | null => {
    if (!handle) return null;
    return byHandle.get(handle.toLowerCase()) ?? null;
  };

  return { getStatus, loaded };
}
