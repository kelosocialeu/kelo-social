import Logo from "@/components/ui/Logo";

interface AuthLayoutProps {
  title: string;
  tagline: string;
  children: React.ReactNode;
}

export default function AuthLayout({
  title,
  tagline,
  children,
}: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-pink-50">

      {/* Décor */}
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"></div>
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl"></div>
      <div className="absolute top-1/3 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl"></div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl overflow-hidden rounded-[36px] border border-white/60 bg-white/70 shadow-2xl backdrop-blur-xl">

        {/* Partie gauche */}
        <div className="hidden w-1/2 flex-col justify-center bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-16 text-white lg:flex">

          <Logo className="mb-8 h-24 w-auto rounded-3xl bg-white p-3 shadow-xl" />

          <h1 className="mb-5 text-6xl font-black leading-tight">
            {title}
          </h1>

          <p className="mb-10 text-xl text-white/90 leading-relaxed">
            {tagline}
          </p>

          <div className="space-y-5">

            <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-3xl">🌍</div>
              <div>
                <h3 className="font-bold">
                  Compatible Multi-PDS
                </h3>
                <p className="text-sm text-white/80">
                  Bluesky, WSocial, Eurosky, Kelo Social…
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-3xl">🛡️</div>
              <div>
                <h3 className="font-bold">
                  Vérification
                </h3>
                <p className="text-sm text-white/80">
                  Certification et vérification humaine.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-3xl">🚀</div>
              <div>
                <h3 className="font-bold">
                  Réseau moderne
                </h3>
                <p className="text-sm text-white/80">
                  Rapide, fédéré et respectueux de votre vie privée.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Partie droite */}
        <div className="flex w-full items-center justify-center p-8 lg:w-1/2">

          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">

            <div className="mb-8 flex flex-col items-center lg:hidden">
              <Logo className="mb-4 h-20" />
              <h1 className="bg-kelo-gradient bg-clip-text text-4xl font-black text-transparent">
                {title}
              </h1>
              <p className="mt-3 text-center text-kelo-muted">
                {tagline}
              </p>
            </div>

            {children}

          </div>

        </div>

      </div>

    </main>
  );
}
