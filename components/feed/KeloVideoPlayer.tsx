"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

interface KeloVideoPlayerProps {
  src: string;
  poster?: string;
}

interface IOSVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
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
  const [buffering, setBuffering] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("16 / 9");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setCurrentTime(video.currentTime || 0);
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      setBuffering(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onError = () => {
      setBuffering(false);
      setFailed(true);
    };
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

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        setBuffering(true);
        await video.play();
      } catch {
        setBuffering(false);
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
    const container = containerRef.current;
    const video = videoRef.current as IOSVideoElement | null;

    try {
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
        return;
      }

      // Safari iPhone/iPad n'autorise pas toujours le plein écran sur un div.
      // On utilise alors l'API vidéo native iOS.
      if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      if (video?.webkitEnterFullscreen) {
        try {
          video.webkitEnterFullscreen();
        } catch {}
      }
    }
  };

  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="group relative mt-3 block overflow-hidden rounded-2xl border border-kelo-border bg-slate-950 sm:rounded-3xl"
      >
        {poster && (
          <img
            src={poster}
            alt=""
            className="aspect-video w-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-lg transition active:scale-95 sm:h-14 sm:w-14 sm:group-hover:scale-105">
            <Play className="h-7 w-7 sm:h-6 sm:w-6" fill="currentColor" />
          </div>
          <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            Ouvrir la vidéo
          </span>
        </div>
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={(event) => event.stopPropagation()}
      className="group relative mt-3 w-full touch-manipulation overflow-hidden rounded-2xl border border-kelo-border bg-black shadow-sm sm:rounded-3xl"
      style={{ aspectRatio }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full bg-black object-contain"
        onClick={togglePlay}
      />

      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </div>
      )}

      {!playing && !buffering && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Lire la vidéo"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-[0_14px_35px_rgba(0,0,0,0.35)] transition active:scale-95 sm:hover:scale-105"
        >
          <Play className="ml-1 h-7 w-7" fill="currentColor" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-10 sm:px-4 sm:pb-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Position de lecture"
          className="h-2 w-full cursor-pointer touch-pan-x accent-kelo-primary sm:h-1.5"
        />

        <div className="mt-2 flex items-center gap-1.5 text-white sm:gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Lecture"}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition active:bg-white/25 sm:h-9 sm:w-9 sm:hover:bg-white/20"
          >
            {playing ? (
              <Pause className="h-5 w-5 sm:h-4 sm:w-4" fill="currentColor" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 sm:h-4 sm:w-4" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Activer le son" : "Couper le son"}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition active:bg-white/25 sm:h-9 sm:w-9 sm:hover:bg-white/20"
          >
            {muted ? (
              <VolumeX className="h-5 w-5 sm:h-4 sm:w-4" />
            ) : (
              <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />
            )}
          </button>

          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/90 sm:text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="hidden rounded-full bg-kelo-gradient px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white min-[430px]:block">
            Kelo
          </div>

          <button
            type="button"
            onClick={fullscreen}
            aria-label="Plein écran"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition active:bg-white/25 sm:h-9 sm:w-9 sm:hover:bg-white/20"
          >
            <Maximize className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
