"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repeat2 } from "lucide-react";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import PostText from "@/components/feed/PostText";
import PostEmbed from "@/components/feed/PostEmbed";
import PostActions from "@/components/feed/PostActions";
import SensitiveContentGate from "@/components/feed/SensitiveContentGate";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import { likePost, unlikePost, repostPost, undoRepost, replyToPost } from "@/lib/atproto/posts";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";

interface PostCardProps { post:any; isMine?:boolean; isBookmarked?:boolean; replyOpen?:boolean; replyText?:string; onToggleReply?:()=>void; onReplyTextChange?:(text:string)=>void; onSendReply?:()=>void; onLike?:()=>void; onRepost?:()=>void; onBookmark?:()=>void; onDelete?:()=>void; onBlocked?:()=>void; onMuted?:()=>void; disableThreadLink?:boolean; }

export default function PostCard({ post,isMine,isBookmarked,replyOpen,replyText,onToggleReply,onReplyTextChange,onSendReply,onLike,onRepost,onBookmark,onDelete,onBlocked,onMuted,disableThreadLink }:PostCardProps) {
  const router=useRouter(); const {dialogOpen,requireVerification,closeDialog}=useIdentityVerification(); const handle=post.author?.handle;
  const [liked,setLiked]=useState(!!post.viewer?.like); const [likeUri,setLikeUri]=useState<string|null>(post.viewer?.like||null); const [localLikeCount,setLocalLikeCount]=useState(post.likeCount||0); const [reposted,setReposted]=useState(!!post.viewer?.repost); const [repostUri,setRepostUri]=useState<string|null>(post.viewer?.repost||null); const [localRepostCount,setLocalRepostCount]=useState(post.repostCount||0); const [liking,setLiking]=useState(false); const [reposting,setReposting]=useState(false); const [replying,setReplying]=useState(false);
  useEffect(()=>{setLiked(!!post.viewer?.like);setLikeUri(post.viewer?.like||null);setLocalLikeCount(post.likeCount||0)},[post.viewer?.like,post.likeCount]);
  useEffect(()=>{setReposted(!!post.viewer?.repost);setRepostUri(post.viewer?.repost||null);setLocalRepostCount(post.repostCount||0)},[post.viewer?.repost,post.repostCount]);
  const handleCardClick=()=>{if(disableThreadLink||!post.uri||post.uri.startsWith("local-"))return;router.push(`/post?uri=${encodeURIComponent(post.uri)}`)};
  const handleLikeAction=async()=>{if(liking||!post.uri||!post.cid)return;const pl=liked,pu=likeUri,pc=localLikeCount;setLiking(true);setLiked(!pl);setLocalLikeCount(pl?Math.max(0,pc-1):pc+1);try{if(pl){if(!pu)throw new Error("Le record du like est introuvable.");await unlikePost(pu);setLikeUri(null)}else setLikeUri(await likePost({uri:post.uri,cid:post.cid}));onLike?.()}catch(e){console.error(e);setLiked(pl);setLikeUri(pu);setLocalLikeCount(pc);alert("Impossible de modifier ce like pour le moment.")}finally{setLiking(false)}};
  const handleRepostAction=async()=>{if(reposting||!post.uri||!post.cid)return;const pr=reposted,pu=repostUri,pc=localRepostCount;setReposting(true);setReposted(!pr);setLocalRepostCount(pr?Math.max(0,pc-1):pc+1);try{if(pr){if(!pu)throw new Error("Le record de republication est introuvable.");await undoRepost(pu);setRepostUri(null)}else setRepostUri(await repostPost({uri:post.uri,cid:post.cid}));onRepost?.()}catch(e){console.error(e);setReposted(pr);setRepostUri(pu);setLocalRepostCount(pc);alert("Impossible de modifier cette republication pour le moment.")}finally{setReposting(false)}};
  const handleReplyToggle=()=>{if(!requireVerification())return;onToggleReply?.()};
  const handleReplyAction=async()=>{if(!requireVerification())return;const cleanText=replyText?.trim();if(replying||!cleanText||!post.uri||!post.cid)return;setReplying(true);try{const root=post.record?.reply?.root;await replyToPost(cleanText,{uri:post.uri,cid:post.cid,root:root?.uri&&root?.cid?{uri:root.uri,cid:root.cid}:undefined});onReplyTextChange?.("");onSendReply?.()}catch(e){console.error(e);alert("Impossible d’envoyer cette réponse pour le moment.")}finally{setReplying(false)}};
  return <article onClick={handleCardClick} className={`p-4 transition-colors hover:bg-kelo-background/60 ${disableThreadLink?"":"cursor-pointer"}`}>
    {post.repostedBy&&<div className="mb-2 flex items-center gap-2 pl-10 text-xs font-semibold text-kelo-muted"><Repeat2 className="h-3.5 w-3.5"/><span className="truncate">{post.repostedBy.displayName||post.repostedBy.handle} a reposté</span></div>}
    <div className="flex gap-3"><Link href={`/profile/${handle}`} onClick={e=>e.stopPropagation()} className="flex-shrink-0"><Avatar src={post.author?.avatar} fallback={handle?handle[0].toUpperCase():"U"}/></Link>
      <div className="min-w-0 flex-grow"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex min-w-0 flex-wrap items-center gap-2"><Link href={`/profile/${handle}`} onClick={e=>e.stopPropagation()} className="flex min-w-0 flex-wrap items-center gap-2 hover:underline"><span className="max-w-full truncate font-bold text-kelo-primary">{post.author?.displayName||"Utilisateur"}</span><span className="max-w-full truncate text-sm text-kelo-primary/80">@{handle}</span></Link><span onClick={e=>e.stopPropagation()} className="flex flex-shrink-0 items-center"><AccountBadges actor={post.author} identitySize="sm" certificationSize={16} gap="xs"/></span></div>{isMine&&onDelete&&<button type="button" onClick={e=>{e.stopPropagation();onDelete()}} className="flex-shrink-0 text-xs font-bold text-kelo-muted transition-colors hover:text-kelo-danger" title="Supprimer" aria-label="Supprimer la publication">🗑️</button>}</div>
        <SensitiveContentGate post={post}><PostText text={post.record?.text||""} facets={post.record?.facets}/><PostEmbed embed={post.embed}/></SensitiveContentGate>
        <PostActions post={post} replyCount={post.replyCount||0} repostCount={localRepostCount} likeCount={localLikeCount} isLiked={liked} isReposted={reposted} isBookmarked={isBookmarked} onReply={handleReplyToggle} onRepost={handleRepostAction} onLike={handleLikeAction} onBookmark={onBookmark} onBlocked={onBlocked} onMuted={onMuted} liking={liking} reposting={reposting}/>
        {replyOpen&&<div className="mt-3 flex gap-2 border-t border-kelo-border pt-3" onClick={e=>e.stopPropagation()}><input type="text" value={replyText} onChange={e=>onReplyTextChange?.(e.target.value)} placeholder="Votre commentaire..." disabled={replying} className="min-w-0 flex-grow rounded-xl bg-kelo-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary disabled:opacity-60"/><button type="button" onClick={handleReplyAction} disabled={replying||!replyText?.trim()} className="flex-shrink-0 rounded-xl bg-kelo-gradient px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{replying?"Envoi...":"Répondre"}</button></div>}
      </div></div><VerificationRequiredDialog open={dialogOpen} onClose={closeDialog}/></article>;
}
