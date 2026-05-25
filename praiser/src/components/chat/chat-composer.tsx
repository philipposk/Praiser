"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useChatController } from "@/hooks/use-chat-controller";
import type { MessageImage } from "@/lib/types";
import { useAppStore } from "@/state/app-store";

export const ChatComposer = () => {
  const lang = useAppStore((s) => s.uiLanguage);
  const praiseVolume = useAppStore((s) => s.praiseVolume);
  const liveMode = useAppStore((s) => s.liveMode);
  const setLiveMode = useAppStore((s) => s.setLiveMode);

  const { sendUserMessage, isProcessing } = useChatController();

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MessageImage[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sendingRef = useRef(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "28px";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [draft]);

  const send = async () => {
    if (sendingRef.current) return;
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    const imagesToSend = [...attachments];
    setDraft("");
    setAttachments([]);
    sendingRef.current = true;
    try {
      await sendUserMessage(text || (lang === "el" ? "Δες αυτά" : "See these"), "text", imagesToSend);
    } finally {
      sendingRef.current = false;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (response.ok) {
          const data = await response.json();
          setAttachments((prev) => [
            ...prev,
            { url: data.url, type: file.type, name: file.name },
          ]);
        } else {
          // fallback to data URL on upload failure
          const reader = new FileReader();
          reader.onload = (ev) => {
            setAttachments((prev) => [
              ...prev,
              { url: ev.target?.result as string, type: file.type, name: file.name },
            ]);
          };
          reader.readAsDataURL(file);
        }
      } catch {
        // ignore individual file failure
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cleanupStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mediaStreamRef.current?.getTracks().forEach((t) => {
      t.stop();
      t.enabled = false;
    });
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const transcribeBlob = async (blob: Blob) => {
    if (blob.size === 0) return;
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, `praiser-${Date.now()}.webm`);
      formData.append("language", lang);
      const response = await fetch("/api/groq/transcribe", { method: "POST", body: formData });
      if (!response.ok) throw new Error("transcribe failed");
      const data: { text?: string } = await response.json();
      const text = data.text?.trim();
      if (text) {
        sendingRef.current = true;
        try {
          await sendUserMessage(text, "voice");
        } finally {
          sendingRef.current = false;
        }
      }
    } catch (error) {
      console.warn("Transcription error", error);
    } finally {
      setTranscribing(false);
    }
  };

  const onVoiceToggle = async () => {
    if (isProcessing || transcribing || liveMode) return;

    if (recording && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        cleanupStream();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      });

      recorder.addEventListener("stop", async () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        cleanupStream();
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          await transcribeBlob(blob);
        }
      });

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      console.error("Voice capture error", error);
      cleanupStream();
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const placeholder =
    lang === "el" ? "Ρώτησε κάτι…" : "Ask anything…";
  const hint =
    lang === "el"
      ? "Enter για αποστολή · Shift+Enter για νέα γραμμή"
      : "Enter to send · Shift+Enter for new line";
  const praiseLabel = lang === "el" ? "Επαίνους" : "Praise";

  return (
    <div className="composer-wrap">
      <div className="composer">
        {attachments.length > 0 && (
          <div className="attach-strip">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="attach-thumb"
                style={{ backgroundImage: `url(${a.url})` }}
              >
                <span className="x" onClick={() => removeAttachment(i)}>
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={liveMode}
        />
        <div className="composer-bar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onPickFile}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add image"
            disabled={isProcessing || transcribing || liveMode}
          >
            <Icon name="image" size={16} />
          </button>
          <button
            type="button"
            className={"icon-btn voice-btn" + (recording ? " live" : "")}
            onClick={onVoiceToggle}
            aria-label="Record"
            disabled={isProcessing || transcribing || liveMode}
            title={
              transcribing
                ? lang === "el"
                  ? "Μεταγραφή…"
                  : "Transcribing…"
                : recording
                  ? lang === "el"
                    ? "Σταμάτημα"
                    : "Stop"
                  : lang === "el"
                    ? "Ηχογράφηση"
                    : "Record"
            }
          >
            <Icon name="mic" size={16} />
          </button>
          <button
            type="button"
            className={"icon-btn voice-btn" + (liveMode ? " live" : "")}
            onClick={() => setLiveMode(!liveMode)}
            aria-label="Live voice"
            disabled={isProcessing || transcribing || recording}
            title={
              liveMode
                ? lang === "el"
                  ? "Live μόντο: ΕΝΕΡΓΟ"
                  : "Live mode: ON"
                : lang === "el"
                  ? "Live μόντο: ξεκινάει συνομιλία χωρίς χέρια"
                  : "Live mode: hands-free conversation"
            }
          >
            <Icon name="radio" size={16} />
          </button>
          <div className="spacer" />
          <button
            type="button"
            className="send-btn"
            disabled={(!draft.trim() && attachments.length === 0) || isProcessing}
            onClick={() => void send()}
            aria-label="Send"
          >
            <Icon name="send" size={15} />
          </button>
        </div>
      </div>
      <div className="composer-hint">
        <span>{hint}</span>
        <span className="praise-mini">
          <span className="label-l">{praiseLabel}</span>
          <span className="mono" style={{ color: "var(--clay)", fontWeight: 500 }}>
            {Math.round(praiseVolume)}%
          </span>
        </span>
      </div>
    </div>
  );
};
