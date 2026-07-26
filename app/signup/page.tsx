'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function Signup() {
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [pdsUrl, setPdsUrl] = useState('https://pds.kelosocial.eu'); 
  const [hcaptchaToken, setHcaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const captchaRef = useRef<HCaptcha>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!hcaptchaToken) {
      setError("Veuillez valider le Captcha anti-robot.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          email,
          password,
          birthDate,
          hcaptchaToken,
          pdsUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      window.location.href = '/login';

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'inscription.");
      captchaRef.current?.resetCaptcha();
      setHcaptchaToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white font-sans text-gray-900">
      <div className="md:w-1/2 bg-[#faf9f6] flex flex-col items-center justify-center p-12 text-center border-r border-gray-200">
        <img
          src="https://kelosocial.sirv.com/logo.png"
          alt="Logo Kelo Social"
          className="h-28 object-contain mb-8 drop-shadow-sm"
        />
        <h1 className="text-5xl lg:text-6xl font-extrabold text-[#d83f87] mb-4">
          Inscription
        </h1>
        <p className="text-xl text-gray-700 font-medium">
          Rejoignez le réseau social souverain et décentralisé
        </p>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Hébergé sur le PDS :
              </label>
              <select
                value={pdsUrl}
                onChange={(e) => setPdsUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d83f87]"
              >
                <option value="https://pds.kelosocial.eu">Kelo Social (pds.kelosocial.eu)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date de naissance (18 ans minimum)
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d83f87]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nom d'utilisateur (Handle)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400">@</span>
                <input
                  type="text"
                  placeholder="votre-nom"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d83f87]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Votre nom final sera @{handle ? handle : 'votre-nom'}.kelosocial.eu</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre.email@exemple.com"
                className="w-full px-4 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d83f87]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Votre mot de passe sécurisé"
                  className="w-full pl-4 pr-16 py-3 bg-[#f2ede9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d83f87]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-sm font-medium text-gray-500 hover:text-[#d83f87] transition-colors"
                >
                  {showPassword ? "Masquer" : "Voir"}
                </button>
              </div>
            </div>

            <div className="flex justify-center my-2">
              <HCaptcha
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
                onVerify={(token) => setHcaptchaToken(token)}
                onExpire={() => setHcaptchaToken('')}
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

            <div className="flex gap-4 mt-2">
              <Link
                href="/login"
                className="w-1/2 py-3 bg-[#f2ede9] text-gray-700 text-center rounded-full font-bold hover:bg-[#e6dfda] transition-colors"
              >
                Déjà un compte ?
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 py-3 bg-[#d83f87] text-white rounded-full font-bold hover:bg-[#bd3675] transition-colors"
              >
                {loading ? 'Création...' : "S'inscrire"}
              </button>
            </div>
            
            <div className="flex justify-center mt-2">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Retour à l'accueil
              </Link>
            </div>
            
          </form>
        </div>
      </div>
    </main>
  );
}
