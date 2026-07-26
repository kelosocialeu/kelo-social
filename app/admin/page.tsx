'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [targetHandle, setTargetHandle] = useState('');
  const [status, setStatus] = useState<'certified' | 'trusted-verifier' | 'none'>('certified');
  const [certifiedUsers, setCertifiedUsers] = useState<any[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('keloCertifiedList') || '[]');
    setCertifiedUsers(saved);
  }, []);

  const handleAssignBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHandle.trim()) return;

    const newList = [...certifiedUsers.filter(u => u.handle !== targetHandle), { handle: targetHandle.trim(), status }];
    setCertifiedUsers(newList);
    localStorage.setItem('keloCertifiedList', JSON.stringify(newList));
    alert(`Le statut "${status}" a été attribué avec succès à @${targetHandle}`);
    setTargetHandle('');
  };

  return (
    <main className="min-h-screen bg-[#faf9f6] text-gray-900 p-6 font-sans">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Administration & Certifications</h1>
          <Link href="/feed" className="text-sm font-bold text-[#3D8BFF] hover:underline">
            ← Retour au fil
          </Link>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          En tant qu'administrateur de la plateforme, attribuez les statuts officiels de certification ou de certificateur de confiance aux comptes du réseau fédéré.
        </p>

        <form onSubmit={handleAssignBadge} className="flex flex-col gap-4 bg-[#faf9f6] p-6 rounded-2xl border border-gray-200 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Identifiant de l'utilisateur (Handle complet)</label>
            <input
              type="text"
              required
              value={targetHandle}
              onChange={(e) => setTargetHandle(e.target.value)}
              placeholder="ex: nom.pds.kelosocial.eu"
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8BFF]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle / Badge à attribuer</label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8BFF]"
            >
              <option value="certified">Compte Certifié</option>
              <option value="trusted-verifier">Certificateur de confiance</option>
              <option value="none">Révoquer (Aucun)</option>
            </select>
          </div>

          <button
            type="submit"
            className="py-3 bg-[#3D8BFF] text-white rounded-xl font-bold text-sm hover:opacity-90 transition shadow-sm mt-2"
          >
            Mettre à jour le statut du compte
          </button>
        </form>

        <h2 className="text-lg font-bold text-gray-900 mb-4">Comptes gérés et certifiés</h2>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
          {certifiedUsers.length > 0 ? (
            certifiedUsers.map((user, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-800">@{user.handle}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.status === 'trusted-verifier' ? 'bg-pink-50 text-[#d83f87] border border-pink-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                  {user.status === 'trusted-verifier' ? 'Certificateur de confiance' : 'Certifié'}
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-gray-400 text-center">Aucun compte configuré pour l'instant.</p>
          )}
        </div>
      </div>
    </main>
  );
}
