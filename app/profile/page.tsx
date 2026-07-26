'use client';

import { useEffect, useState } from 'react';
import { AtpAgent } from '@atproto/api';
import Link from 'next/link';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 'trusted-verifier' | 'certified' | 'none'
  const [badgeType, setBadgeType] = useState<'trusted-verifier' | 'certified' | 'none'>('none');

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const handle = localStorage.getItem('userHandle') || 'matte.pds.kelosocial.eu';
        const pdsService = localStorage.getItem('pdsService') || 'https://pds.kelosocial.eu';
        const accessJwt = localStorage.getItem('accessJwt');

        if (accessJwt) {
          const agent = new AtpAgent({ service: pdsService });
          await agent.resumeSession({
            accessJwt: accessJwt,
            refreshJwt: localStorage.getItem('refreshJwt') || '',
            active: true,
            handle: handle,
            did: localStorage.getItem('userDid') || '',
          });

          // Récupération du profil global AT Protocol
          const res = await agent.api.app.bsky.actor.getProfile({ actor: handle });
          setProfile(res.data);

          // Exemple de logique de badge basée sur des métadonnées ou labels de l'instance
          if (handle.includes('matte') || handle.includes('admin')) {
            setBadgeType('trusted-verifier');
          }

          // Récupération des posts de l'utilisateur
          const feedRes = await agent.api.app.bsky.feed.getAuthorFeed({ actor: handle, limit: 20 });
          setUserPosts(feedRes.data.feed || []);
        } else {
          setProfile({
            handle: handle,
            displayName: 'Utilisateur Kelo',
            description: "Membre de la bêta Kelo Social - Synchronisé avec l'AT Protocol",
          });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil:", err);
        setProfile({
          handle: localStorage.getItem('userHandle') || 'matte.pds.kelosocial.eu',
          displayName: 'Utilisateur Kelo',
          description: 'Profil hors-ligne ou session expirée.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f6] text-gray-900 flex items-center justify-center font-sans">
        <p className="text-lg font-medium text-gray-500">Chargement de votre profil souverain...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-gray-900 flex flex-col items-center p-4 font-sans pb-20">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mt-4 md:mt-10">
        <div className="h-40 rounded-2xl bg-gradient-to-r from-[#3D8BFF] via-[#5C6BC0] to-[#9B26B6] mb-16 relative">
          <div className="absolute -bottom-12 left-6 w-24 h-24 bg-white rounded-full p-1 shadow-md">
            <div className="w-full h-full bg-[#f2ede9] rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={profile?.avatar || "https://kelosocial.sirv.com/logo.png"}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="px-2">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-gray-900">
              {profile?.displayName || 'Mon Profil'}
            </h1>

            {/* Affichage conditionnel strict des badges */}
            {badgeType === 'trusted-verifier' && (
              <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 px-3 py-1 rounded-full shadow-sm">
                <img
                  src="https://kelosocial.sirv.com/1784816368891-removebg-preview.png"
                  alt="Badge Certificateur de confiance"
                  className="h-5 w-5 object-contain"
                />
                <span className="text-xs font-bold text-[#d83f87]">Certificateur de confiance</span>
              </div>
            )}

            {badgeType === 'certified' && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-sm">
                <img
                  src="https://kelosocial.sirv.com/ChatGPT%20Image%2025%20juil.%202026%2C%2022_56_32.png"
                  alt="Badge Certifié"
                  className="h-5 w-5 object-contain"
                />
                <span className="text-xs font-bold text-blue-600">Certifié</span>
              </div>
            )}
          </div>

          <p className="text-[#3D8BFF] font-semibold text-base mb-4">
            @{profile?.handle || 'matte.pds.kelosocial.eu'}
          </p>

          <p className="text-gray-600 leading-relaxed mb-6">
            {profile?.description || "Bienvenue sur mon profil Kelo Social."}
          </p>

          <div className="flex gap-4 mb-8">
            <Link
              href="/feed"
              className="px-6 py-2.5 bg-gradient-to-r from-[#3D8BFF] to-[#9B26B6] text-white font-bold rounded-full hover:opacity-90 transition text-center text-sm shadow-sm"
            >
              Retour au fil d'actualité
            </Link>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-4 border-t border-gray-100 pt-6">
            Publications de l'utilisateur
          </h2>

          <div className="divide-y divide-gray-100">
            {userPosts.length > 0 ? (
              userPosts.map((item: any) => (
                <div key={item.post.uri} className="py-4">
                  <p className="text-gray-800 text-sm whitespace-pre-wrap">{item.post.record.text}</p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {new Date(item.post.record.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm py-4">Aucune publication pour l'instant.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
