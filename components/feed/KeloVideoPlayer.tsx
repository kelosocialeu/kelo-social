"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";

interface KeloVideoPlayerProps {
  src: string;
  poster?: string;
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
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setCurrentTime(video.currentTime || 0);
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setFailed(true);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setFailed(true);
      }
    } else {
      video.pause();
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
    try {
      await containerRef.current?.requestFullscreen?.();
    } catch {}
  };

  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="group relative mt-3 block overflow-hidden rounded-3xl border border-kelo-border bg-slate-950"
      >
        {poster && <img src={poster} alt="" className="aspect-video w-full object-cover opacity-80" />}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-lg transition group-hover:scale-105">
            <Play className="h-6 w-6" fill="currentColor" />
          </div>
          <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">Ouvrir la vidéo</span>
        </div>
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={(event) => event.stopPropagation()}
      className="group relative mt-3 overflow-hidden rounded-3xl border border-kelo-border bg-slate-950 shadow-sm"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black object-contain"
        onClick={togglePlay}
      />

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Lire la vidéo"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-[0_14px_35px_rgba(0,0,0,0.35)] transition hover:scale-105 active:scale-95"
        >
          <Play className="ml-1 h-7 w-7" fill="currentColor" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-3 pt-10 opacity-100 transition sm:px-4">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Position de lecture"
          className="h-1.5 w-full cursor-pointer accent-kelo-primary"
        />

        <div className="mt-2 flex items-center gap-2 text-white">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Lecture"} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20">
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          <button type="button" onClick={toggleMute} aria-label={muted ? "Activer le son" : "Couper le son"} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <span className="min-w-0 flex-1 text-xs font-semibold text-white/90">{formatTime(currentTime)} / {formatTime(duration)}</span>

          <div className="rounded-full bg-kelo-gradient px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">Kelo</div>

          <button type="button" onClick={fullscreen} aria-label="Plein écran" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
