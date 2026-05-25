"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAppStore } from "@/state/app-store";
import { useChatController } from "@/hooks/use-chat-controller";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useVad } from "@/hooks/use-vad";

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const MIN_UTTERANCE_BYTES = 1024; // skip tiny blobs (clicks, breaths)

/**
 * Live hands-free voice mode.
 *
 * Lifecycle:
 *   start() → getUserMedia → MediaRecorder running continuously → VAD watches RMS
 *     ↳ on speech-end: stop recorder, ship audio to /api/groq/transcribe, then
 *       sendUserMessage(text). New recorder armed for next utterance.
 *     ↳ on assistant message: TTS speak; mic paused during playback to avoid
 *       capturing our own voice; resume on tts end.
 *   stop() → tear everything down.
 *
 * The store flag `liveMode` is the single source of truth — flipping it via
 * setLiveMode() triggers start/stop.
 */
export const useLiveVoiceMode = () => {
  const liveMode = useAppStore((s) => s.liveMode);
  const setLiveMode = useAppStore((s) => s.setLiveMode);
  const uiLanguage = useAppStore((s) => s.uiLanguage);
  const setProcessing = useAppStore((s) => s.setProcessing);

  const { sendUserMessage } = useChatController();
  const { speak, cancel: cancelTts } = useTextToSpeech();
  const vad = useVad({
    threshold: 0.025,
    silenceHangoverMs: 900,
    speechMinMs: 150,
    onSpeechStart: () => {
      // No-op for now — chunks are collected continuously.
    },
    onSpeechEnd: () => {
      handleUtteranceEnd();
    },
  });

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const utterancePendingRef = useRef(false);
  const micPausedRef = useRef(false);
  const lastSpokenIdRef = useRef<string | null>(null);
  const liveModeRef = useRef(liveMode);

  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  const armRecorder = useCallback(() => {
    if (!streamRef.current || !liveModeRef.current) return;
    const mime = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    chunksRef.current = [];

    rec.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    });

    rec.start(100);
    recorderRef.current = rec;
  }, []);

  const transcribeAndSend = useCallback(
    async (blob: Blob) => {
      if (blob.size < MIN_UTTERANCE_BYTES) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

      try {
        const formData = new FormData();
        formData.append("audio", blob, `live-${Date.now()}.webm`);
        formData.append("language", uiLanguage);
        const response = await fetch("/api/groq/transcribe", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.details || `Transcribe ${response.status}`);
        }
        const data: { text?: string } = await response.json();
        const text = data.text?.trim();
        if (!text || !liveModeRef.current) return;
        await sendUserMessage(text, "voice");
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") {
          console.warn("Live transcribe error:", error);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [sendUserMessage, uiLanguage],
  );

  const handleUtteranceEnd = useCallback(() => {
    if (utterancePendingRef.current || micPausedRef.current) return;
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;

    utterancePendingRef.current = true;

    rec.addEventListener(
      "stop",
      async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        utterancePendingRef.current = false;

        await transcribeAndSend(blob);

        // Re-arm for next utterance if still in live mode + mic isn't paused.
        if (liveModeRef.current && !micPausedRef.current) {
          armRecorder();
        }
      },
      { once: true },
    );

    try {
      rec.stop();
    } catch {
      utterancePendingRef.current = false;
    }
  }, [armRecorder, transcribeAndSend]);

  const pauseMic = useCallback(() => {
    micPausedRef.current = true;
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    vad.stop();
  }, [vad]);

  const resumeMic = useCallback(() => {
    if (!liveModeRef.current) return;
    micPausedRef.current = false;
    if (streamRef.current) {
      vad.start(streamRef.current);
      armRecorder();
    }
  }, [armRecorder, vad]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      vad.start(stream);
      armRecorder();
    } catch (error) {
      console.error("Live mode mic access failed:", error);
      setLiveMode(false);
    }
  }, [armRecorder, setLiveMode, vad]);

  const stop = useCallback(() => {
    cancelTts();
    vad.stop();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    utterancePendingRef.current = false;
    micPausedRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
        t.enabled = false;
      });
      streamRef.current = null;
    }
  }, [cancelTts, vad]);

  // React to liveMode toggle
  useEffect(() => {
    if (liveMode) {
      void start();
    } else {
      stop();
    }
    return () => {
      if (!liveModeRef.current) stop();
    };
  }, [liveMode, start, stop]);

  // Speak new assistant messages while in live mode.
  useEffect(() => {
    if (!liveMode) return;
    const unsub = useAppStore.subscribe((state, prev) => {
      if (!liveModeRef.current) return;
      const next = state.messages;
      if (next.length === 0 || next === prev.messages) return;
      const last = next[next.length - 1];
      if (!last || last.role !== "assistant") return;
      if (last.id === lastSpokenIdRef.current) return;
      lastSpokenIdRef.current = last.id;
      setProcessing(false);

      pauseMic();
      void speak({
        text: last.content,
        language: uiLanguage,
        onEnd: () => resumeMic(),
        onError: () => resumeMic(),
      });
    });
    return unsub;
  }, [liveMode, pauseMic, resumeMic, setProcessing, speak, uiLanguage]);

  return { liveMode, setLiveMode };
};
