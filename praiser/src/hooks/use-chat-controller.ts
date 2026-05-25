"use client";

import { useCallback, useRef } from "react";

import { useAppStore } from "@/state/app-store";
import type { Message, MessageImage } from "@/lib/types";

const PRAISE_REQUEST_TIMEOUT_MS = 60_000;

export const useChatController = () => {
  const addMessage = useAppStore((state) => state.addMessage);
  const setProcessing = useAppStore((state) => state.setProcessing);
  const appendMessages = useAppStore((state) => state.appendMessages);
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

      try {
        const lastUserMessage = { role: "user" as const, content: trimmed, images };
        const messagesPayload = [...existingMessages, lastUserMessage].filter(
          (message) => message.role === "user" || message.role === "assistant",
        );

        const abortController = new AbortController();
        const timeoutId = setTimeout(
          () => abortController.abort(),
          PRAISE_REQUEST_TIMEOUT_MS,
        );

        let response: Response;
        try {
          response = await fetch("/api/groq/praise", {
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
        } catch (fetchError) {
          if ((fetchError as { name?: string })?.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
          }
          throw fetchError;
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          let errorMessage = errorBody?.details || errorBody?.error || "Request failed.";
          
          // Provide more helpful error messages
          if (response.status === 503) {
            errorMessage = errorBody?.error || "The AI service is currently overloaded. Please try again in a few moments.";
          } else if (response.status === 429) {
            errorMessage = "Too many requests. Please wait a moment and try again.";
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Handle assistant message
        const messagesToAdd: Array<Omit<Message, "id" | "createdAt">> = [];
        
        if (data.assistantMessage || data.assistant_message) {
          const assistantMessage = data.assistantMessage || data.assistant_message;
          const currentMessages = useAppStore.getState().messages;
          const lastMessage = currentMessages[currentMessages.length - 1];
          
          // Avoid duplicate messages
          if (lastMessage?.role !== "assistant" || lastMessage?.content !== assistantMessage) {
            messagesToAdd.push({
              role: "assistant",
              content: assistantMessage,
            });
          }
        }

        // Handle separate image message if provided
        if (data.separateImageMessage) {
          messagesToAdd.push({
            role: "assistant",
            content: data.separateImageMessage.content,
            images: data.separateImageMessage.images,
          });
        }

        if (messagesToAdd.length > 0) {
          appendMessages(messagesToAdd);
        }
      } catch (error) {
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
      } finally {
        setProcessing(false);
        requestInFlightRef.current = false;
      }
    },
    [addMessage, appendMessages, setProcessing, personInfo, praiseVolume],
  );

  return {
    sendUserMessage,
    isProcessing,
  };
};
