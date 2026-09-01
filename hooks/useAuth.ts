"use client";
import { useCallback,useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import * as authService from "@/services/auth.service";
import type { LoginCredentials } from "@/types/auth";
async function trackLoginActivity(session:ReturnType<typeof authService.getStoredSession>,method:"password"|"qr-kelo-id"){if(!session)return;const send=async()=>{const response=await fetch("/api/login-activity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session,method}),keepalive:true,cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`)};try{await send()}catch{try{await new Promise(r=>window.setTimeout(r,350));await send()}catch{}}}
export function useAuth(){const router=useRouter();const{refreshSession,logout:logoutContext}=useAuthContext();const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);
 const login=useCallback(async(credentials:LoginCredentials,options?:{redirect?:boolean})=>{setLoading(true);setError(null);try{const session=await authService.login(credentials);await trackLoginActivity(session,"password");refreshSession();if(options?.redirect!==false)router.replace("/feed");return true}catch(err){setError(err instanceof Error?err.message:"Une erreur inconnue est survenue.");return false}finally{setLoading(false)}},[refreshSession,router]);
 const logout=useCallback(()=>{logoutContext();router.replace("/login")},[logoutContext,router]);return{login,logout,loading,error};}