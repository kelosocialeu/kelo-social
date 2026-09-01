"use client";

import { useEffect } from "react";

const LOGO = "https://kelosocial.sirv.com/logo.png";

export default function AuthSuccessAnimation({ title, message, onDone, duration = 1800 }: { title: string; message: string; onDone: () => void; duration?: number }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onDone, reduce ? 350 : duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDone]);

  return <div className="kelo-auth-success" role="status" aria-live="polite">
    <div className="kelo-auth-success-orb kelo-auth-success-orb-a"/><div className="kelo-auth-success-orb kelo-auth-success-orb-b"/>
    <div className="kelo-auth-success-card">
      <div className="kelo-auth-success-logo-wrap"><span className="kelo-auth-success-ring"/><img src={LOGO} alt="Kelo Social" className="kelo-auth-success-logo"/><span className="kelo-auth-success-check">✓</span></div>
      <h2>{title}</h2><p>{message}</p>
      <div className="kelo-auth-success-loader"><span/></div>
    </div>
  </div>;
}