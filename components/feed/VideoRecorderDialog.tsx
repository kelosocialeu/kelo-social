"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Circle,
  RotateCcw,
  Square,
  SwitchCamera,
  Upload,
  X,
} from "lucide-react";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

type Props = {
  open: boolean;
  onClose: () => void;
  onVideoSelected: (file: File) => void;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function fileExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export default function VideoRecorderDialog({
  open,
  onClose,
  onVideoSelected,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }

  function clearRecording() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl("");
    setRecordedFile(null);
    setSeconds(0);
  }

  async function startCamera(nextFacingMode = facingMode) {
    setError("");
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Votre navigateur ne permet pas l’enregistrement vidéo direct. Vous pouvez importer une vidéo à la place.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (cameraError) {
      console.error("Kelo Social camera error:", cameraError);
      setError("Impossible d’accéder à la caméra ou au micro. Vérifiez les autorisations du navigateur, ou importez une vidéo.");
    }
  }

  useEffect(() => {
    if (!open) return;

    clearRecording();
    setRecording(false);
    setError("");
    void startCamera(facingMode);

    return () => {
      stopTimer();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      stopStream();
    };
    // Camera initialization should run when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  async function switchCamera() {
    if (recording) return;
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    clearRecording();
    await startCamera(next);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || !cameraReady) return;

    if (typeof MediaRecorder === "undefined") {
      setError("L’enregistrement vidéo direct n’est pas pris en charge par ce navigateur.");
      return;
    }

    clearRecording();
    chunksRef.current = [];
    setError("");

    try {
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setError("Une erreur est survenue pendant l’enregistrement.");
        setRecording(false);
        stopTimer();
      };

      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        chunksRef.current = [];
        setRecording(false);
        stopTimer();

        if (blob.size === 0) {
          setError("La vidéo enregistrée est vide. Réessayez.");
          return;
        }

        if (blob.size > MAX_VIDEO_BYTES) {
          setError("La vidéo dépasse la limite de 50 Mo. Enregistrez une vidéo plus courte.");
          return;
        }

        const file = new File(
          [blob],
          `kelo-video-${Date.now()}.${fileExtension(actualMime)}`,
          { type: actualMime.split(";", 1)[0] }
        );
        const url = URL.createObjectURL(file);
        setRecordedFile(file);
        setRecordedUrl(url);
      };

      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((value) => value + 1);
      }, 1000);
    } catch (recordError) {
      console.error("Kelo Social recorder error:", recordError);
      setError("Impossible de démarrer l’enregistrement vidéo sur cet appareil.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function retake() {
    clearRecording();
    setError("");
    void startCamera(facingMode);
  }

  function useRecording() {
    if (!recordedFile) return;
    stopStream();
    onVideoSelected(recordedFile);
  }

  function close() {
    if (recording) stopRecording();
    stopTimer();
    stopStream();
    clearRecording();
    onClose();
  }

  function importVideo(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Sélectionnez un fichier vidéo.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("La vidéo dépasse la limite de 50 Mo.");
      return;
    }
    stopStream();
    onVideoSelected(file);
  }

  if (!open) return null;

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm md:items-center md:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Filmer une vidéo"
        className="w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-2xl md:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-kelo-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-kelo-primary" />
            <h2 className="font-extrabold text-kelo-text">Filmer une vidéo</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-kelo-background"
            aria-label="Fermer la caméra"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="bg-black">
          {recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              playsInline
              className="max-h-[65dvh] w-full object-contain"
            />
          ) : (
            <div className="relative flex min-h-72 items-center justify-center bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="max-h-[65dvh] w-full object-contain"
              />

              {recording && (
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-sm font-bold text-white">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  {minutes}:{secs}
                </div>
              )}

              {!cameraReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/80">
                  Ouverture de la caméra…
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {error && (
            <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-kelo-danger">
              {error}
            </p>
          )}

          {!recordedUrl ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={switchCamera}
                disabled={recording || !cameraReady}
                className="flex h-12 items-center gap-2 rounded-full border border-kelo-border px-4 text-sm font-bold text-kelo-text disabled:opacity-40"
              >
                <SwitchCamera className="h-5 w-5" />
                Retourner
              </button>

              {recording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-200 bg-red-600 text-white shadow-lg"
                  aria-label="Arrêter l’enregistrement"
                >
                  <Square className="h-6 w-6 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!cameraReady}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-200 bg-white shadow-lg disabled:opacity-40"
                  aria-label="Commencer l’enregistrement"
                >
                  <Circle className="h-10 w-10 fill-red-600 text-red-600" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(event) => {
                  importVideo(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={recording}
                className="flex h-12 items-center gap-2 rounded-full border border-kelo-border px-4 text-sm font-bold text-kelo-text disabled:opacity-40"
              >
                <Upload className="h-5 w-5" />
                Importer
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={retake}
                className="flex h-12 items-center gap-2 rounded-full border border-kelo-border px-5 text-sm font-bold text-kelo-text"
              >
                <RotateCcw className="h-5 w-5" />
                Refilmer
              </button>
              <button
                type="button"
                onClick={useRecording}
                className="h-12 rounded-full bg-kelo-gradient px-6 text-sm font-bold text-white shadow-sm"
              >
                Utiliser cette vidéo
              </button>
            </div>
          )}

          <p className="text-center text-xs text-kelo-muted">
            Kelo Social utilise la caméra et le micro uniquement pendant l’enregistrement. Vidéo maximale : 50 Mo.
          </p>
        </div>
      </section>
    </div>
  );
}
