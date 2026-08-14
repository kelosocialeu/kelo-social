"use client";

import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function JournalPage() {
  const { checked, handle } = useRequireAuth();

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-md sm:px-5 lg:px-6">
          <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">Journal</h1>
        </header>

        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-12">
          <div className="max-w-md text-center">
            <h2 className="text-lg font-bold text-kelo-text">Journal</h2>
            <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
              Cette page est prête à être construite.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
