'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AtpAgent } from '@atproto/api';

export default function FeedPage() {
  const [handle, setHandle] = useState('');
  const [pdsService, setPdsService] = useState('https://pds.kelosocial.eu');
  const [postText, setPostText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  const [posts, setPosts] = useState<any[]>([
    {
      uri: 'post-default-1',
      author: { handle: 'matte.pds.kelosocial.eu', displayName: 'Matte (Kelo)' },
      record: { text: "Bienvenue sur le fil d'actualité fédéré de Kelo Social ! Connecté à l'AT Protocol. Testez les likes, commentaires et republications !" },
      likeCount: 4,
      repostCount: 2,
      replyCount: 1,
      viewer: { like: false, repost: false }
    }
  ]);
  const [loadingPost, setLoadingPost] = useState(false);
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const savedHandle = localStorage.getItem('userHandle');
    const savedPds = localStorage.getItem('pdsService');
    if (savedHandle) setHandle(savedHandle);
    if (savedPds) setPdsService(savedPds);

    async function fetchFederatedFeed() {
      try {
        const agent = new AtpAgent({ service: savedPds || 'https://pds.kelosocial.eu' });
        const res = await agent.api.app.bsky.feed.getTimeline({ limit: 30 });
        if (res.data && res.data.feed && res.data.feed.length > 0) {
          // Formatage pour s'assurer que les compteurs existent
          const formattedFeed = res.data.feed.map((item: any) => ({
            uri: item.post.uri,
            cid: item.post.cid,
            author: item.post.author,
            record: item.post.record,
            likeCount: item.post.likeCount || 0,
            repostCount: item.post.repostCount || 0,
            replyCount: item.post.replyCount || 0,
            viewer: item.post.viewer || {}
          }));
          setPosts((prev) => [...formattedFeed, ...prev]);
        }
      } catch (err) {
        console.error("Chargement du flux distant indisponible, utilisation du flux local.", err);
      }
    }

    fetchFederatedFeed();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    setLoadingPost(true);
    try {
      const accessToken = localStorage.getItem('accessJwt');
      const currentHandle = localStorage.getItem('userHandle');
      const currentPds = localStorage.getItem('pdsService') || 'https://pds.kelosocial.eu';

      if (accessToken && currentHandle) {
        const agent = new AtpAgent({ service: currentPds });
        await agent.resumeSession({
          accessJwt: accessToken,
          refreshJwt: localStorage.getItem('refreshJwt') || '',
          active: true,
          handle: currentHandle,
          did: localStorage.getItem('userDid') || '',
        });

        await agent.api.app.bsky.feed.post.create(
          { repo: agent.session?.did || currentHandle },
          {
            text: postText,
            createdAt: new Date().toISOString(),
          }
        );
      }

      const newPostItem = {
        uri: 'local-' + Date.now(),
        author: { handle: currentHandle || 'moi.kelosocial.eu', displayName: currentHandle || 'Moi' },
        record: { text: postText, createdAt: new Date().toISOString() },
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
        viewer: {}
      };

      setPosts([newPostItem, ...posts]);
      setPostText('');
    } catch (err) {
      console.error("Erreur lors de la publication", err);
      alert("Erreur lors de la publication sur le PDS.");
    } finally {
      setLoadingPost(false);
    }
  };

  // Action Like
  const handleLike = (uri: string) => {
    setPosts(posts.map(p => {
      if (p.uri === uri) {
        const liked = p.viewer?.like;
        return {
          ...p.viewer,
          viewer: { ...p.viewer, like: !liked },
          likeCount: liked ? p.likeCount - 1 : p.likeCount + 1
        };
      }
      return p;
    }));
  };

  // Action Repost
  const handleRepost = (uri: string) => {
    setPosts(posts.map(p => {
      if (p.uri === uri) {
        const reposted = p.viewer?.repost;
        return {
          ...p,
          viewer: { ...p.viewer, repost: !reposted },
          repostCount: reposted ? p.repostCount - 1 : p.repostCount + 1
        };
      }
      return p;
    }));
  };

  // Action Conserver / Bookmark (Stockage local)
  const handleBookmark = (post: any) => {
    const saved = JSON.parse(localStorage.getItem('keloBookmarks') || '[]');
    if (!saved.some((item: any) => item.uri === post.uri)) {
      saved.push(post);
      localStorage.setItem('keloBookmarks', JSON.stringify(saved));
      alert("Publication enregistrée dans vos favoris !");
    } else {
      alert("Cette publication est déjà dans vos favoris.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const filteredPosts = posts.filter((item: any) => {
    const text = item.record?.text?.toLowerCase() || '';
    const authorHandle = item.author?.handle?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return text.includes(query) || authorHandle.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#faf9f6] flex justify-center font-sans text-gray-900">
      <div className="w-full max-w-7xl flex">
        {/* Navigation Gauche */}
        <aside className="hidden md:flex flex-col w-72 p-6 border-r border-gray-200 h-screen sticky top-0 justify-between bg-white">
          <div>
            <div className="flex flex-col items-center mb-8">
              <img
                src="https://kelosocial.sirv.com/logo.png"
                alt="Logo Kelo Social"
                className="h-16 w-auto mb-2 object-contain"
              />
              <span className="text-xs font-bold text-[#3D8BFF] bg-blue-50 px-3 py-1 rounded-full shadow-sm">
                Réseau Souverain
              </span>
            </div>
            <nav className="flex flex-col gap-2 font-semibold text-base text-gray-700">
              <Link href="/feed" className="flex items-center gap-4 hover:bg-gray-50 p-3 rounded-2xl text-[#3D8BFF] bg-blue-50/60">
                🏠 Accueil
              </Link>
              <Link href="/profile" className="flex items-center gap-4 hover:bg-gray-50 p-3 rounded-2xl">
                👤 Profil & Badges
              </Link>
            </nav>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs text-gray-500 mb-2 truncate">
              Connecté : <span className="font-bold text-gray-800">@{handle || 'invité'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Fil Central */}
        <main className="flex-grow max-w-2xl border-r border-gray-200 min-h-screen bg-white pb-20 shadow-sm">
          <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-gray-200">
            <div className="flex justify-between items-center p-4">
              <h2 className="text-xl font-extrabold text-gray-900">Accueil Fédéré</h2>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">AT Protocol</span>
            </div>
            <div className="flex w-full border-t border-gray-100 text-sm">
              <button
                onClick={() => setActiveTab('discover')}
                className={`flex-1 text-center font-bold py-3 transition-colors ${activeTab === 'discover' ? 'border-b-4 border-[#3D8BFF] text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Découvrir
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`flex-1 text-center font-bold py-3 transition-colors ${activeTab === 'following' ? 'border-b-4 border-[#3D8BFF] text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Abonnements
              </button>
            </div>
          </div>

          <form onSubmit={handleCreatePost} className="p-4 border-b border-gray-200 bg-[#faf9f6]/50">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3D8BFF] to-[#9B26B6] flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm">
                {handle ? handle[0].toUpperCase() : 'K'}
              </div>
              <div className="w-full">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Quoi de neuf sur le réseau décentralisé ?"
                  rows={3}
                  className="w-full bg-transparent focus:outline-none text-base resize-none text-gray-800 placeholder-gray-400"
                />
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200/60">
                  <span className="text-xs text-gray-400 truncate max-w-[200px]">PDS : {pdsService}</span>
                  <button
                    type="submit"
                    disabled={loadingPost || !postText.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#3D8BFF] via-[#5C6BC0] to-[#9B26B6] text-white rounded-full font-bold text-sm hover:opacity-90 transition shadow-sm"
                  >
                    {loadingPost ? 'Publication...' : 'Publier'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Liste des posts avec interactions */}
          <div className="divide-y divide-gray-100">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((item: any, idx: number) => {
                const post = item;
                const isLiked = post.viewer?.like;
                const isReposted = post.viewer?.repost;

                return (
                  <div key={post.uri || idx} className="p-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                        {post.author?.handle ? post.author.handle[0].toUpperCase() : 'U'}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{post.author?.displayName || 'Utilisateur'}</span>
                          <span className="text-gray-500 text-sm">@{post.author?.handle}</span>
                        </div>
                        <p className="mt-2 text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
                          {post.record?.text}
                        </p>

                        {/* Barre d'actions interactive : Commenter, Republier, Liker, Conserver */}
                        <div className="flex justify-between mt-4 text-gray-500 max-w-md text-sm">
                          {/* Bouton Commenter */}
                          <button 
                            onClick={() => setActiveReplyUri(activeReplyUri === post.uri ? null : post.uri)}
                            className="hover:text-[#3D8BFF] flex items-center gap-1 transition-colors"
                          >
                            💬 <span>{post.replyCount || 0}</span>
                          </button>

                          {/* Bouton Republier */}
                          <button 
                            onClick={() => handleRepost(post.uri)}
                            className={`flex items-center gap-1 transition-colors ${isReposted ? 'text-green-600 font-bold' : 'hover:text-green-500'}`}
                          >
                            🔄 <span>{post.repostCount || 0}</span>
                          </button>

                          {/* Bouton Liker */}
                          <button 
                            onClick={() => handleLike(post.uri)}
                            className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'}`}
                          >
                            {isLiked ? '❤️' : '🤍'} <span>{post.likeCount || 0}</span>
                          </button>

                          {/* Bouton Conserver / Bookmark */}
                          <button 
                            onClick={() => handleBookmark(post)}
                            className="hover:text-[#3D8BFF] transition-colors"
                            title="Conserver dans vos favoris"
                          >
                            📥
                          </button>
                        </div>

                        {/* Zone de réponse / commentaire rapide */}
                        {activeReplyUri === post.uri && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Écrire un commentaire..."
                              className="w-full px-3 py-2 bg-[#f2ede9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8BFF]"
                            />
                            <button
                              onClick={() => {
                                alert("Commentaire envoyé !");
                                setReplyText('');
                                setActiveReplyUri(null);
                              }}
                              className="px-4 py-2 bg-[#3D8BFF] text-white text-xs font-bold rounded-xl hover:opacity-90"
                            >
                              Répondre
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-400 py-10 text-sm">Aucune publication trouvée.</p>
            )}
          </div>
        </main>

        {/* Barre de Recherche Droite */}
        <aside className="hidden lg:block w-80 p-6 h-screen sticky top-0 bg-white border-l border-gray-200">
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Rechercher posts & comptes..."
              className="w-full pl-4 pr-4 py-3 bg-[#f2ede9] rounded-full focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] text-sm"
            />
          </div>
          <div className="bg-[#faf9f6] p-4 rounded-2xl border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Tendances Fédérées</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="p-2 hover:bg-white rounded-xl transition cursor-pointer">
                <p className="text-xs text-gray-500">AT Protocol</p>
                <p className="font-bold text-gray-800">#KeloSocial</p>
              </div>
              <div className="p-2 hover:bg-white rounded-xl transition cursor-pointer">
                <p className="text-xs text-gray-500">Identité & Sécurité</p>
                <p className="font-bold text-gray-800">#KeloID</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
