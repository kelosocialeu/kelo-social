import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-gray-900 font-sans">
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center max-w-sm w-full">
          
          {/* Intégration du logo Kelo Social */}
          <img 
            src="https://kelosocial.sirv.com/logo.png" 
            alt="Logo Kelo Social" 
            className="h-32 w-auto mb-4 drop-shadow-sm"
          />
          
          <span className="bg-[#d83f87] text-white text-xs font-bold px-3 py-1 rounded-full mb-6">
            BETA
          </span>
          
          <h2 className="text-xl font-semibold mb-8 text-gray-800">
            Quoi de neuf ?
          </h2>
          
          <div className="w-full flex flex-col gap-4">
            <Link 
              href="/register" 
              className="w-full py-3 bg-[#d83f87] text-white text-center rounded-full font-bold text-lg hover:bg-[#bd3675] transition-colors"
            >
              S'inscrire
            </Link>
            <Link 
              href="/login" 
              className="w-full py-3 bg-[#f2ede9] text-gray-700 text-center rounded-full font-bold text-lg hover:bg-[#e6dfda] transition-colors"
            >
              Connexion
            </Link>
          </div>
        </div>
      </main>

      <footer className="w-full p-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-[#d83f87] border-t border-gray-100 max-w-3xl mx-auto">
        <Link href="/terms" className="hover:underline">Conditions générales</Link>
        <Link href="/privacy" className="hover:underline">Politique de confidentialité</Link>
        <div className="flex items-center gap-2 text-gray-600 ml-auto">
          <span>🌐 français - French</span>
        </div>
      </footer>
    </div>
  );
}
