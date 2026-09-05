"use client";
import { ReactNode } from "react";
import KeloIdFeatureLock from "@/components/verification/KeloIdFeatureLock";
export default function JournalLayout({ children }: { children: ReactNode }) {
  return <KeloIdFeatureLock feature="le Journal" mode="block" className="min-h-screen">{children}</KeloIdFeatureLock>;
}
