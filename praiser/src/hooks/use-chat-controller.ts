"use client";

import { useCallback, useRef } from "react";

import { useAppStore } from "@/state/app-store";
import type { Message, MessageImage } from "@/lib/types";

const PRAISE_REQUEST_TIMEOUT_MS = 120_000;
const FIRST_TOKEN_TIMEOUT_MS = 30_000;
const MEMORIZE_INTERVAL = 8; // assistant messages between memory updates

const triggerMemorize = async (lang: "el" | "en") => {
  const state = useAppStore.getState();
  const person = state.personInfo;
  if (!person || !person.id) return;

  const assistantCount = state.messages.filter((m) => m.role === "assistant").length;
  const lastUpdate = person.memoryUpdatedAt ?? 0;
  if (assistantCount < MEMORIZE_INTERVAL) return;
  if (assistantCount - lastUpdate < MEMORIZE_INTERVAL) return;

  try {
    const trimmed = state.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-30)
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch("/api/persons/memorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personName: person.name,
        previousMemory: person.memory ?? "",
        messages: trimmed,
        lang,
      }),
    });
    if (!response.ok) return;
    const data: { memory?: string } = await response.json();
    if (data.memory && person.id) {
      useAppStore.getState().updatePerson(person.id, {
        memory: data.memory,
        memoryUpdatedAt: assistantCount,
      });
    }
  } catch {
    // best-effort background job; ignore failures
  }
};

export const useChatController = () => {
  const addMessage = useAppStore((state) => state.addMessage);
  const appendMessages = useAppStore((state) => state.appendMessages);
  const appendToMessageContent = useAppStore((state) => state.appendToMessageContent);
  const setProcessing = useAppStore((state) => state.setProcessing);
  const personInfo = useAppStore((state) => state.personInfo);
  const praiseVolume = useAppStore((state) => state.praiseVolume);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const requestInFlightRef = useRef(false);

  const sendUserMessage = useCallback(
    async (content: string, source: "text" | "voice" = "text", images?: MessageImage[]) => {
      if ((!content.trim() && (!images || images.length === 0)) || requestInFlightRef.current) return;

      const trimmed = content.trim();
      requestInFlightRef.current = true;

      const existingMessages = useAppStore.getState().messages;

      addMessage({
        role: "user",
        content: trimmed,
        source,
        images,
      });

      setProcessing(true);

      const abortController = new AbortController();
      const overallTimeout = setTimeout(
        () => abortController.abort(),
        PRAISE_REQUEST_TIMEOUT_MS,
      );

      try {
        const lastUserMessage = { role: "user" as const, content: trimmed, images };
        const messagesPayload = [...existingMessages, lastUserMessage].filter(
          (message) => message.role === "user" || message.role === "assistant",
        );

        const response = await fetch("/api/groq/praise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: messagesPayload.map(({ role, content, images: msgImages }) => ({
              role,
              content,
              images: msgImages,
            })),
            personInfo,
            praiseVolume,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          let errorMessage = errorBody?.details || errorBody?.error || "Request failed.";
          if (response.status === 503) {
            errorMessage = errorBody?.error || "The AI service is currently overloaded. Please try again in a few moments.";
          } else if (response.status === 429) {
            errorMessage = "Too many requests. Please wait a moment and try again.";
          }
          throw new Error(errorMessage);
        }

        const contentType = response.headers.get("content-type") ?? "";

        // -------- Streaming branch (SSE) --------
        if (contentType.includes("text/event-stream") && response.body) {
          const assistantId = addMessage({ role: "assistant", content: "" });
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let gotFirstToken = false;
          const firstTokenTimeout = setTimeout(() => {
            if (!gotFirstToken) abortController.abort();
          }, FIRST_TOKEN_TIMEOUT_MS);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let sep: number;
              while ((sep = buffer.indexOf("\n\n")) >= 0) {
                const chunk = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                const line = chunk.split("\n").find((l) => l.startsWith("data:"));
                if (!line) continue;
                let payload: { type?: string; text?: string; message?: string };
                try {
                  payload = JSON.parse(line.slice(5).trim());
                } catch {
                  continue;
                }
                if (payload.type === "delta" && payload.text) {
                  if (!gotFirstToken) {
                    gotFirstToken = true;
                    clearTimeout(firstTokenTimeout);
                  }
                  appendToMessageContent(assistantId, payload.text);
                } else if (payload.type === "error") {
                  throw new Error(payload.message || "Stream error");
                }
              }
            }
          } finally {
            clearTimeout(firstTokenTimeout);
          }

          // Save the completed assistant message via debounced chat save
          // (triggered by the next addMessage / setChatName / etc — explicit
          // saveCurrentChat avoids losing the streamed reply if user closes).
          useAppStore.getState().saveCurrentChat();
          // Fire-and-forget memory update.
          void triggerMemorize(useAppStore.getState().uiLanguage);
          return;
        }

        // -------- Non-streaming branch (JSON) --------
        const data = await response.json();
        const messagesToAdd: Array<Omit<Message, "id" | "createdAt">> = [];

        const assistantMessage = data.assistantMessage || data.assistant_message;
        if (assistantMessage) {
          const currentMessages = useAppStore.getState().messages;
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage?.role !== "assistant" || lastMessage?.content !== assistantMessage) {
            messagesToAdd.push({ role: "assistant", content: assistantMessage });
          }
        }
        if (data.separateImageMessage) {
          messagesToAdd.push({
            role: "assistant",
            content: data.separateImageMessage.content,
            images: data.separateImageMessage.images,
          });
        }
        if (messagesToAdd.length > 0) {
          appendMessages(messagesToAdd);
          void triggerMemorize(useAppStore.getState().uiLanguage);
        }
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") {
          appendMessages([
            {
              role: "system",
              content: "Request timed out. Please try again.",
            },
          ]);
        } else {
          console.error("sendUserMessage error", error);
          appendMessages([
            {
              role: "system",
              content:
                error instanceof Error
                  ? `I couldn't reach the AI: ${error.message}. Please try again.`
                  : "Something went wrong. Please try again.",
            },
          ]);
        }
      } finally {
        clearTimeout(overallTimeout);
        setProcessing(false);
        requestInFlightRef.current = false;
      }
    },
    [addMessage, appendMessages, appendToMessageContent, setProcessing, personInfo, praiseVolume],
  );

  return {
    sendUserMessage,
    isProcessing,
  };
};
