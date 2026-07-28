import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6">

        <img
          src="https://kelosocial.sirv.com/logo.png"
          alt="Kelo Social"
          className="h-36 mb-8"
        />

        <span className="rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-lg">
          Version Bêta
        </span>

        <h1 className="mt-8 text-center text-6xl font-black tracking-tight">
          Bienvenue sur
          <span className="block bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
            Kelo Social
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-center text-lg text-gray-600">
          Le réseau social européen basé sur l'AT Protocol.
          Connectez-vous avec votre fournisseur d'identité préféré,
          échangez librement et gardez le contrôle de vos données.
        </p>

        <div className="mt-12 flex w-full max-w-md flex-col gap-4">

          <Link
            href="/register"
            className="rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 py-4 text-center text-lg font-bold text-white shadow-xl transition hover:scale-105"
          >
            Créer un compte
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-violet-200 bg-white py-4 text-center text-lg font-bold text-violet-700 shadow transition hover:bg-violet-50"
          >
            Se connecter
          </Link>

        </div>

        <div className="mt-16 grid max-w-5xl gap-6 md:grid-cols-3">

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="mb-3 text-3xl">🌍</div>
            <h3 className="font-bold text-lg">
              Fédération
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Compatible avec plusieurs PDS et l'ensemble de l'écosystème
              AT Protocol.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="mb-3 text-3xl">🛡️</div>
            <h3 className="font-bold text-lg">
              Vérification
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Les comptes pourront être vérifiés grâce à Kelo ID et recevoir
              des badges de certification.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="mb-3 text-3xl">🚀</div>
            <h3 className="font-bold text-lg">
              Moderne
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Une interface rapide, élégante et pensée pour offrir une
              expérience agréable sur ordinateur comme sur mobile.
            </p>
          </div>

        </div>

      </div>

      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">

          <div className="flex gap-6 text-sm">
            <Link href="/terms" className="hover:text-violet-600">
              Conditions générales
            </Link>

            <Link href="/privacy" className="hover:text-violet-600">
              Politique de confidentialité
            </Link>
          </div>

          <span className="text-sm text-gray-500">
            🌐 Français
          </span>

        </div>
      </footer>

    </main>
  );
}
