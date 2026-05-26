"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAppStore } from "@/state/app-store";

const TTS_REQUEST_TIMEOUT_MS = 30_000;

type ServerCapability = {
  available: boolean;
  providers: string[];
};

type SpeakOptions = {
  text: string;
  language?: string; // 'el' | 'en' | other BCP-47
  onEnd?: () => void;
  onError?: (err: unknown) => void;
};

/**
 * Text-to-speech dispatcher. Strategy:
 *   1. If server /api/tts has providers configured, POST text → play returned audio.
 *   2. Else fall back to window.speechSynthesis with the selected voice URI.
 *   3. On any failure, fall back to browser TTS rather than dying silently.
 *
 * Manages a single audio element + a single SpeechSynthesisUtterance at a time;
 * calling speak() while already speaking cancels the previous one.
 */
export const useTextToSpeech = () => {
  const ttsVoiceUri = useAppStore((s) => s.ttsVoiceUri);
  const uiLanguage = useAppStore((s) => s.uiLanguage);

  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [serverCapability, setServerCapability] = useState<ServerCapability>({
    available: false,
    providers: [],
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelledRef = useRef(false);

  // Load voices (some browsers populate them asynchronously).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const load = () => {
      const list = window.speechSynthesis.getVoices() || [];
      setVoices(list);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, []);

  // Probe server TTS once per mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/tts", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { available?: boolean; serverProviders?: string[] } | null) => {
        if (cancelled || !data) return;
        setServerCapability({
          available: Boolean(data.available),
          providers: data.serverProviders ?? [],
        });
      })
      .catch(() => {
        // ignore — browser fallback works regardless
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeaking(false);
  }, []);

  const speakBrowser = useCallback(
    (text: string, language: string, onEnd?: () => void, onError?: (e: unknown) => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onError?.(new Error("speechSynthesis unavailable"));
        return;
      }

      const u = new SpeechSynthesisUtterance(text);
      const langTag = language.startsWith("el") ? "el-GR" : "en-US";
      u.lang = langTag;
      u.rate = 1.0;
      u.pitch = 1.0;

      // Voice selection: explicit voiceUri > best lang match > default
      const available = window.speechSynthesis.getVoices();
      const explicit = ttsVoiceUri ? available.find((v) => v.voiceURI === ttsVoiceUri) : null;
      const byLang =
        available.find((v) => v.lang === langTag) ||
        available.find((v) => v.lang.startsWith(language));
      const chosen = explicit ?? byLang ?? null;
      if (chosen) u.voice = chosen;

      u.addEventListener("end", () => {
        if (cancelledRef.current) return;
        setSpeaking(false);
        utteranceRef.current = null;
        onEnd?.();
      });
      u.addEventListener("error", (event) => {
        setSpeaking(false);
        utteranceRef.current = null;
        onError?.(event);
      });

      utteranceRef.current = u;
      setSpeaking(true);
      cancelledRef.current = false;
      window.speechSynthesis.speak(u);
    },
    [ttsVoiceUri],
  );

  const speak = useCallback(
    async ({ text, language, onEnd, onError }: SpeakOptions) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      const lang = language || uiLanguage || "en";
      cancel(); // stop anything in flight
      cancelledRef.current = false;

      if (!serverCapability.available) {
        speakBrowser(cleanText, lang, onEnd, onError);
        return;
      }

      // If the active person has a cloned voice, use it for ElevenLabs.
      const personVoiceId = useAppStore.getState().personInfo?.ttsVoiceId;

      // Server TTS path
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanText,
            language: lang,
            ...(personVoiceId ? { voiceId: personVoiceId } : {}),
          }),
          signal: controller.signal,
        });

        if (response.status === 204) {
          speakBrowser(cleanText, lang, onEnd, onError);
          return;
        }
        if (!response.ok) {
          throw new Error(`TTS HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setSpeaking(true);

        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(url);
          if (cancelledRef.current) return;
          setSpeaking(false);
          audioRef.current = null;
          onEnd?.();
        });
        audio.addEventListener("error", (event) => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          audioRef.current = null;
          // Fall back to browser TTS on playback failure.
          speakBrowser(cleanText, lang, onEnd, onError ?? ((e) => console.warn(e, event)));
        });

        await audio.play();
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") {
          onError?.(error);
          return;
        }
        // Any server failure → browser fallback so the user still hears something.
        console.warn("Server TTS failed, falling back to browser:", error);
        speakBrowser(cleanText, lang, onEnd, onError);
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [cancel, serverCapability.available, speakBrowser, uiLanguage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return {
    speak,
    cancel,
    speaking,
    voices,
    serverCapability,
  };
};
