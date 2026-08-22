"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface KeloVideoPlayerProps {
  src: string;
  poster?: string;
}

interface IOSVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

declare global {
  interface Window {
    Hls?: any;
    __keloHlsPromise?: Promise<any>;
  }
}

const HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";

function ensureHlsJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Hls) return Promise.resolve(window.Hls);
  if (window.__keloHlsPromise) return window.__keloHlsPromise;

  window.__keloHlsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${HLS_JS_URL}"]`);
    if (existing) {
      if (window.Hls) return resolve(window.Hls);
      existing.addEventListener("load", () => resolve(window.Hls), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = HLS_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.Hls);
    script.onerror = () => reject(new Error("Chargement HLS impossible"));
    document.head.appendChild(script);
  });

  return window.__keloHlsPromise;
}

function canUseMseH264(): boolean {
  if (typeof window === "undefined") return false;
  const scope = window as any;
  const MediaSourceCtor = scope.ManagedMediaSource || scope.MediaSource || scope.WebKitMediaSource;
  if (!MediaSourceCtor?.isTypeSupported) return false;
  return MediaSourceCtor.isTypeSupported('video/mp4; codecs="avc1.42E01E"') &&
    MediaSourceCtor.isTypeSupported('audio/mp4; codecs="mp4a.40.2"');
}

function looksLikeHls(src: string) {
  return /\.m3u8(?:$|\?)/i.test(src) || /video\.bsky\.app/i.test(src);
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function KeloVideoPlayer({ src, poster }: KeloVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [aspectRatio, setAspectRatio] = useState("16 / 9");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let recoveryCount = 0;

    setFailed(false);
    setBuffering(true);

    const attach = async () => {
      const isHls = looksLikeHls(src);

      if (isHls) {
        try {
          const Hls = await ensureHlsJs();
          if (cancelled) return;

          // Comme le lecteur web officiel Bluesky, on privilégie hls.js dès que
          // MediaSource + H.264/AAC sont réellement disponibles. Cela évite les
          // faux positifs canPlayType() de certains navigateurs Android.
          if (Hls?.isSupported?.() && canUseMseH264()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
              maxMaxBufferLength: 10,
              maxBufferLength: 10,
              backBufferLength: 20,
              startLevel: -1,
            });
            hlsRef.current = hls;
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
            hls.on(Hls.Events.MANIFEST_PARSED, () => setBuffering(false));
            hls.on(Hls.Events.ERROR, (_event: unknown, data: any) => {
              if (!data?.fatal) return;
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryCount < 2) {
                recoveryCount += 1;
                try { hls.startLoad(); } catch {}
                return;
              }
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryCount < 2) {
                recoveryCount += 1;
                try { hls.recoverMediaError(); } catch {}
                return;
              }
              setBuffering(false);
              setFailed(true);
            });
            return;
          }
        } catch (error) {
          console.warn("hls.js indisponible, tentative HLS native", error);
        }

        // Safari/iPhone/iPad et certains téléviseurs savent lire HLS nativement.
        if (video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL")) {
          video.src = src;
          video.load();
          return;
        }

        setBuffering(false);
        setFailed(true);
        return;
      }

      // MP4, WebM, MOV et autres formats compris nativement par le navigateur.
      video.src = src;
      video.load();
    };

    const onTime = () => setCurrentTime(video.currentTime || 0);
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => { setPlaying(true); setBuffering(false); };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onError = () => { setBuffering(false); setFailed(true); };
    const onMetadata = () => {
      setDuration(video.duration || 0);
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
      }
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);
    void attach();

    return () => {
      cancelled = true;
      try { hlsRef.current?.destroy?.(); } catch {}
      hlsRef.current = null;
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, retryKey]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || failed) return;
    try {
      if (video.paused) { setBuffering(true); await video.play(); }
      else video.pause();
    } catch {
      setBuffering(false);
      setFailed(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const seek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(duration) || duration <= 0) return;
    video.currentTime = value;
    setCurrentTime(value);
  };

  const fullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current as IOSVideoElement | null;
    try {
      if (container?.requestFullscreen) await container.requestFullscreen();
      else video?.webkitEnterFullscreen?.();
    } catch {
      try { video?.webkitEnterFullscreen?.(); } catch {}
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={(event) => event.stopPropagation()}
      className="group relative mt-3 w-full touch-manipulation overflow-hidden rounded-2xl border border-kelo-border bg-black shadow-sm sm:rounded-3xl"
      style={{ aspectRatio, maxHeight: "72vh" }}
    >
      <video ref={videoRef} poster={poster} playsInline preload="metadata" className="absolute inset-0 h-full w-full bg-black object-contain" onClick={togglePlay} />

      {buffering && !failed && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"><Loader2 className="h-6 w-6 animate-spin" /></div></div>}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-4 text-center text-white">
          <p className="text-sm font-bold">Impossible de lire cette vidéo sur cet appareil.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold backdrop-blur"><RotateCcw className="h-4 w-4" />Réessayer</button>
            <a href={src} target="_blank" rel="noopener noreferrer" className="rounded-full bg-kelo-gradient px-4 py-2 text-xs font-bold">Ouvrir la vidéo</a>
          </div>
        </div>
      ) : !playing && !buffering && (
        <button type="button" onClick={togglePlay} aria-label="Lire la vidéo" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-[0_14px_35px_rgba(0,0,0,0.35)] transition active:scale-95 sm:hover:scale-105"><Play className="ml-1 h-7 w-7" fill="currentColor" /></button>
      )}

      {!failed && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-10 sm:px-4 sm:pb-3">
        <input type="range" min={0} max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label="Position de lecture" className="h-2 w-full cursor-pointer touch-pan-x accent-kelo-primary sm:h-1.5" />
        <div className="mt-2 flex items-center gap-1.5 text-white sm:gap-2">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Lecture"} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition active:bg-white/25 sm:h-9 sm:w-9 sm:hover:bg-white/20">{playing ? <Pause className="h-5 w-5 sm:h-4 sm:w-4" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5 sm:h-4 sm:w-4" fill="currentColor" />}</button>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Activer le son" : "Couper le son"} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition active:bg-white/25 sm:h-9 sm:w-9 sm:hover:bg-white/20">{muted ? <VolumeX className="h-5 w-5 sm:h-4 sm:w-4" /> : <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />}</button>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/90 sm:text-xs">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <button type="button" onClick={fullscreen} aria-label="Plein écran" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition active:bg-white/25 sm:h-9 sm:w-9 sm:hover:bg-white/20"><Maximize className="h-5 w-5 sm:h-4 sm:w-4" /></button>
        </div>
      </div>}
    </div>
  );
}
