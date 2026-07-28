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

      {/* Décoration */}
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"></div>
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl"></div>
      <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl"></div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl overflow-hidden rounded-[36px] border border-white/60 bg-white/70 shadow-2xl backdrop-blur-xl">

        {/* Partie gauche */}
        <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-16 text-center text-white lg:flex">

          <Logo className="mb-12 h-48 w-auto object-contain drop-shadow-2xl" />

          <h1 className="mb-6 text-6xl font-black leading-tight">
            {title}
          </h1>

          <p className="max-w-md text-xl leading-9 text-white/95">
            {tagline}
          </p>

          <div className="mt-10 max-w-md">
            <p className="text-lg leading-8 text-white/85">
              Bienvenue sur <strong>Kelo Social</strong>, le réseau social
              européen basé sur l'AT Protocol.
              <br />
              <br />
              Retrouvez votre communauté, publiez librement et profitez
              d'une plateforme moderne, fédérée et pensée pour la confiance.
            </p>
          </div>

        </div>

        {/* Partie droite */}
        <div className="flex w-full items-center justify-center p-10 lg:w-1/2">

          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">

            {/* Mobile */}
            <div className="mb-8 flex flex-col items-center lg:hidden">

              <Logo className="mb-6 h-24 w-auto object-contain" />

              <h1 className="bg-kelo-gradient bg-clip-text text-4xl font-black text-transparent">
                {title}
              </h1>

              <p className="mt-4 text-center text-kelo-muted">
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
