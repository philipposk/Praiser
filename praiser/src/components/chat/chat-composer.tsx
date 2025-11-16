"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Mic, MicOff, Loader2, Image as ImageIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { useAppStore } from "@/state/app-store";
import type { MessageImage } from "@/lib/types";
import { useChatController } from "@/hooks/use-chat-controller";

type ChatComposerProps = {
  className?: string;
};

export const ChatComposer = ({ className }: ChatComposerProps) => {
  const messages = useAppStore((state) => state.messages);
  const [draft, setDraft] = useState("");
  const [attachedImages, setAttachedImages] = useState<MessageImage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendUserMessage, isProcessing } = useChatController();
  const uiLanguage = useAppStore((state) => state.uiLanguage);
  const t = useTranslation(uiLanguage);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!draft.trim() && attachedImages.length === 0) || isProcessing || isSubmittingRef.current) return;

    const messageToSend = draft.trim();
    const imagesToSend = [...attachedImages];
    setDraft("");
    setAttachedImages([]);
    isSubmittingRef.current = true;

    try {
      await sendUserMessage(messageToSend || "See attached images", "text", imagesToSend);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        console.warn("Skipping non-image file:", file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachedImages((prev) => [
          ...prev,
          {
            url: dataUrl,
            type: file.type,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceToggle = async () => {
    if (isProcessing || isTranscribing) return;

    // If already recording, stop it
    if (isRecording && mediaRecorderRef.current) {
      try {
        // Stop recording
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        // Don't set isRecording to false here - let the stop event handler do it
        return;
      } catch (error) {
        console.error("Error stopping recording:", error);
        cleanupStream();
        return;
      }
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg",
      });
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        try {
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
            chunksRef.current = [];
            cleanupStream();
            await transcribeBlob(blob);
          } else {
            cleanupStream();
          }
        } catch (error) {
          console.error("Error in stop handler:", error);
          cleanupStream();
        }
      });

      recorder.addEventListener("error", (event) => {
        console.error("MediaRecorder error:", event);
        cleanupStream();
      });

      recorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Voice capture error", error);
      cleanupStream();
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  const cleanupStream = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const transcribeBlob = async (blob: Blob) => {
    if (blob.size === 0 || isProcessing || isSubmittingRef.current) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, `praiser-voice-${Date.now()}.webm`);
      const response = await fetch("/api/groq/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.details || "Transcription failed.");
      }
      const data: { text?: string } = await response.json();
      if (data.text && !isSubmittingRef.current) {
        const textToSend = data.text.trim();
        setDraft("");
        isSubmittingRef.current = true;
        try {
          await sendUserMessage(textToSend, "voice");
        } finally {
          isSubmittingRef.current = false;
        }
      }
    } catch (error) {
      console.error("Transcription error", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative shrink-0 border-t border-white/5 bg-[#1a1a1a] px-4 pt-4 pb-6",
        className,
      )}
    >
      {attachedImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/40 p-2">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative">
              <img
                src={img.url}
                alt={img.name || `Image ${idx + 1}`}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -right-1 -top-1 rounded-full bg-rose-500 p-0.5 text-white transition hover:bg-rose-600"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mx-auto flex w-full max-w-4xl items-end gap-3">
        <div className="flex flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 focus-within:border-white/20">
          <textarea
            ref={textareaRef}
            id="praiser-message"
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-base leading-6 text-white placeholder:text-white/40 focus:outline-none"
            placeholder={t.askAnything}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!isProcessing && !isSubmittingRef.current && (draft.trim() || attachedImages.length > 0)) {
                  const messageToSend = draft.trim();
                  const imagesToSend = [...attachedImages];
                  setDraft("");
                  setAttachedImages([]);
                  isSubmittingRef.current = true;
                  sendUserMessage(messageToSend || "See attached images", "text", imagesToSend).finally(() => {
                    isSubmittingRef.current = false;
                  });
                }
              }
            }}
          />
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleImageSelect}
              disabled={isProcessing}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isTranscribing}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t.addImages}
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isProcessing || isTranscribing}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t.voiceCapture}
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : isRecording ? (
                <Mic className="h-5 w-5 text-rose-400 animate-pulse" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isProcessing || isTranscribing}
          aria-label={t.sendToMike}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
};
