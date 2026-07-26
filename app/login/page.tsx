'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AtpAgent } from '@atproto/api';

export default function Login() {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [pdsUrl, setPdsUrl] = useState('https://pds.kelosocial.eu');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalisation de l'URL du PDS
      let formattedPds = pdsUrl.trim();
      if (!formattedPds.startsWith('http://') && !formattedPds.startsWith('https://')) {
        formattedPds = `https://${formattedPds}`;
      }

      const agent = new AtpAgent({ service: formattedPds });
      
      // Tentative de connexion standard AT Protocol
      await agent.login({
        identifier: handle.trim(),
        password: password,
      });

      localStorage.setItem('accessJwt', agent.session?.accessJwt || '');
      localStorage.setItem('refreshJwt', agent.session?.refreshJwt || '');
      localStorage.setItem('userHandle', agent.session?.handle || handle);
      localStorage.setItem('userDid', agent.session?.did || '');
      localStorage.setItem('pdsService', formattedPds);

      window.location.href = '/feed';
    } catch (err: any) {
      console.error(err);
      setError('Échec de la connexion. Vérifiez vos identifiants ou le PDS sélectionné.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#faf9f6] font-sans text-gray-900">
      <div className="md:w-1/2 bg-white flex flex-col items-center justify-center p-12 text-center border-r border-gray-200">
        <img
          src="https://kelosocial.sirv.com/logo.png"
          alt="Logo Kelo Social"
          className="h-28 object-contain mb-8 drop-shadow-sm"
        />
        <h1 className="text-5xl lg:text-6xl font-extrabold text-[#3D8BFF] mb-4">
          Connexion
        </h1>
        <p className="text-xl text-gray-700 font-medium max-w-md">
          Accédez à votre espace souverain et fédéré sur l'AT Protocol.
        </p>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-8 bg-[#faf9f6]">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fournisseur d'identité (PDS)
              </label>
              <select
                value={pdsUrl}
                onChange={(e) => setPdsUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] text-sm"
              >
                <option value="https://pds.kelosocial.eu">Kelo Social (pds.kelosocial.eu)</option>
                <option value="https://pds.wsocial.eu">WSocial (pds.wsocial.eu)</option>
                <option value="https://eurosky.social">Eurosky / Mu Social</option>
                <option value="https://bsky.social">Bluesky (bsky.social)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Identifiant / Handle
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400">@</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="votre-compte.kelosocial.eu"
                  className="w-full pl-10 pr-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full px-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#3D8BFF] via-[#5C6BC0] to-[#9B26B6] text-white rounded-full font-bold text-base hover:opacity-90 transition shadow-md"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>

            <Link
              href="/signup"
              className="w-full py-3.5 bg-[#f2ede9] text-gray-700 text-center rounded-full font-bold text-base hover:bg-[#e6dfda] transition"
            >
              Créer un nouveau compte
            </Link>

            <div className="flex justify-center mt-2">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                ← Retour à l'accueil
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
