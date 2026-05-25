"use client";

import { useCallback, useEffect, useRef } from "react";

export type VadOptions = {
  /** RMS threshold above which a frame is considered speech. 0..1. */
  threshold?: number;
  /** Minimum continuous-above-threshold time before declaring speech onset (ms). */
  speechMinMs?: number;
  /** Continuous-below-threshold time before declaring speech end (ms). */
  silenceHangoverMs?: number;
  /** Sample window for RMS calc (ms). Smaller = more responsive, more CPU. */
  frameMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
};

/**
 * Simple RMS-based voice activity detector.
 *
 * Caller hands in a MediaStream (from getUserMedia). The hook taps the stream
 * with an AnalyserNode, samples RMS at `frameMs` intervals, and emits onset /
 * end callbacks. State (speaking vs silent) is debounced with separate
 * speech-onset and silence-hangover timers so a single noisy frame doesn't
 * flip the state.
 *
 * Returns { start, stop, isActive } — call start(stream) when you want VAD
 * running; call stop() to detach. Re-mounting with a new stream requires a
 * stop()/start() cycle.
 */
export const useVad = (opts: VadOptions = {}) => {
  const {
    threshold = 0.025,
    speechMinMs = 120,
    silenceHangoverMs = 800,
    frameMs = 50,
  } = opts;

  const onSpeechStartRef = useRef(opts.onSpeechStart);
  const onSpeechEndRef = useRef(opts.onSpeechEnd);
  useEffect(() => {
    onSpeechStartRef.current = opts.onSpeechStart;
    onSpeechEndRef.current = opts.onSpeechEnd;
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const speakingRef = useRef(false);
  const aboveSinceRef = useRef<number | null>(null);
  const belowSinceRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        /* ignore */
      }
      analyserRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    activeRef.current = false;
    speakingRef.current = false;
    aboveSinceRef.current = null;
    belowSinceRef.current = null;
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      if (activeRef.current) stop();
      if (typeof window === "undefined") return;

      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      const ctx = new Ctor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      ctxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      activeRef.current = true;

      const buffer = new Float32Array(analyser.fftSize);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);

        // Compute RMS
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSq += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSq / buffer.length);

        const now = performance.now();
        if (rms >= threshold) {
          if (aboveSinceRef.current === null) aboveSinceRef.current = now;
          belowSinceRef.current = null;

          if (!speakingRef.current && now - aboveSinceRef.current >= speechMinMs) {
            speakingRef.current = true;
            onSpeechStartRef.current?.();
          }
        } else {
          if (belowSinceRef.current === null) belowSinceRef.current = now;
          aboveSinceRef.current = null;

          if (speakingRef.current && now - belowSinceRef.current >= silenceHangoverMs) {
            speakingRef.current = false;
            onSpeechEndRef.current?.();
          }
        }
      }, frameMs);
    },
    [frameMs, silenceHangoverMs, speechMinMs, stop, threshold],
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, isActive: () => activeRef.current };
};
