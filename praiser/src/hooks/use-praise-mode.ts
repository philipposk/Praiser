"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/state/app-store";

export const usePraiseMode = () => {
  const praiseMode = useAppStore((state) => state.praiseMode);
  const praiseBarVisible = useAppStore((state) => state.praiseBarVisible);
  const manualPraiseVolume = useAppStore((state) => state.manualPraiseVolume);
  const setPraiseVolume = useAppStore((state) => state.setPraiseVolume);
  const messages = useAppStore((state) => state.messages);
  const currentChatId = useAppStore((state) => state.currentChatId);
  
  // Use refs to persist sequence across renders
  const autoRandomSequenceRef = useRef<number[]>([]);
  const crescendoQuestionCountRef = useRef(0);
  const crescendoCycleCompleteRef = useRef(false);
  const lastQuestionCountRef = useRef(0);
  const lastChatIdRef = useRef<string | null>(null);
  const orgasmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (orgasmTimeoutRef.current) {
        clearTimeout(orgasmTimeoutRef.current);
        orgasmTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Reset when chat changes (new chat or loaded chat)
    if (currentChatId !== lastChatIdRef.current) {
      // Chat changed - reset everything for auto-random and crescendo modes
      if (praiseMode === "auto-random" || praiseMode === "crescendo") {
        autoRandomSequenceRef.current = [];
        crescendoQuestionCountRef.current = 0;
        crescendoCycleCompleteRef.current = false;
        lastQuestionCountRef.current = 0;
        setPraiseVolume(0);
      }
      lastChatIdRef.current = currentChatId;
    }

    // Count user messages (questions)
    const userMessages = messages.filter((msg) => msg.role === "user");
    const questionCount = userMessages.length;

    // Reset if messages were cleared (new chat or chat loaded with no messages)
    if (messages.length === 0 && (praiseMode === "auto-random" || praiseMode === "crescendo")) {
      autoRandomSequenceRef.current = [];
      crescendoQuestionCountRef.current = 0;
      crescendoCycleCompleteRef.current = false;
      lastQuestionCountRef.current = 0;
      setPraiseVolume(0);
      return;
    }

    // Only update when question count changes
    if (questionCount === lastQuestionCountRef.current) {
      return;
    }
    lastQuestionCountRef.current = questionCount;

    if (praiseMode === "auto-random") {
      // Mode 1: Auto-random - within 5 questions, show 0, 100, and 3 middle values in random order
      // First is always 0
      if (questionCount === 0) {
        autoRandomSequenceRef.current = [];
        setPraiseVolume(0);
        return;
      }

      if (questionCount === 1) {
        // First question: always 0
        setPraiseVolume(0);
        // Generate sequence: 0, 100, and 3 middle values (25, 50, 75) in random order
        const middleValues = [25, 50, 75];
        const shuffled = [100, ...middleValues].sort(() => Math.random() - 0.5);
        autoRandomSequenceRef.current = [0, ...shuffled];
        return;
      }

      if (questionCount <= 5 && questionCount - 1 < autoRandomSequenceRef.current.length) {
        setPraiseVolume(autoRandomSequenceRef.current[questionCount - 1]);
      } else if (questionCount > 5) {
        // After 5 questions, cycle through the sequence (skip the first 0)
        const cycleIndex = ((questionCount - 1) % (autoRandomSequenceRef.current.length - 1)) + 1;
        setPraiseVolume(autoRandomSequenceRef.current[cycleIndex]);
      }
    } else if (praiseMode === "crescendo") {
      // Mode 2: Starts at 0, goes to 100 within 10 questions, then orgasm message and reset
      if (questionCount === 0) {
        crescendoQuestionCountRef.current = 0;
        crescendoCycleCompleteRef.current = false;
        setPraiseVolume(0);
        return;
      }

      // Check if we just completed a cycle
      const prevCount = crescendoQuestionCountRef.current;
      if (crescendoCycleCompleteRef.current && questionCount > prevCount) {
        // New cycle started
        crescendoQuestionCountRef.current = 0;
        crescendoCycleCompleteRef.current = false;
        setPraiseVolume(0);
        return;
      }

      if (questionCount <= 10 && !crescendoCycleCompleteRef.current) {
        // Linear progression from 0 to 100 over 10 questions
        const volume = Math.round((questionCount / 10) * 100);
        setPraiseVolume(volume);
        crescendoQuestionCountRef.current = questionCount;

        // At question 10, trigger orgasm message
        if (questionCount === 10) {
          crescendoCycleCompleteRef.current = true;
          // Add orgasm message
          const orgasmMessages = [
            "Wow... that was intense! 😊",
            "Phew! That felt amazing! 😌",
            "Incredible! I need a moment... 😅",
            "That was something else! 😊",
            "Amazing! Let me catch my breath... 😌",
          ];
          const randomMessage = orgasmMessages[Math.floor(Math.random() * orgasmMessages.length)];

          if (orgasmTimeoutRef.current) {
            clearTimeout(orgasmTimeoutRef.current);
          }
          orgasmTimeoutRef.current = setTimeout(() => {
            orgasmTimeoutRef.current = null;
            useAppStore.getState().addMessage({
              role: "assistant",
              content: randomMessage,
            });
          }, 500);
        }
      }
    } else if (praiseMode === "manual") {
      // Mode 3: Manual - use manual volume if bar is hidden, otherwise use current volume
      if (!praiseBarVisible) {
        setPraiseVolume(manualPraiseVolume);
      }
    }
  }, [messages, praiseMode, praiseBarVisible, manualPraiseVolume, setPraiseVolume, currentChatId]);
};

