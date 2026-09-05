"use client";

import { ReactNode } from "react";
import KeloIdFeatureLock from "@/components/verification/KeloIdFeatureLock";

export default function GamesLayout({ children }: { children: ReactNode }) {
  return <KeloIdFeatureLock feature="les Jeux Kelo" mode="block" className="min-h-screen">{children}</KeloIdFeatureLock>;
}
