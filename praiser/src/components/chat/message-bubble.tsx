"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { Message } from "@/lib/types";
import { useAppStore } from "@/state/app-store";

type Props = {
  message: Message;
  onImageClick: (url: string) => void;
};

const formatRelative = (iso: string, lang: "el" | "en") => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return lang === "el" ? "πριν λίγο" : "just now";
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return lang === "el" ? "μόλις τώρα" : "just now";
  if (diffMin < 60) return lang === "el" ? `πριν ${diffMin}λ` : `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === "el" ? `πριν ${diffHr}ω` : `${diffHr}h`;
  return new Date(iso).toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
    day: "numeric",
    month: "short",
  });
};

export const MessageBubble = ({ message, onImageClick }: Props) => {
  const lang = useAppStore((s) => s.uiLanguage);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isVoice = message.source === "voice";

  const copy = async () => {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard?.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  const shareMsg = async () => {
    if (typeof navigator === "undefined") return;
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content });
      } else {
        await navigator.clipboard?.writeText(message.content);
      }
    } catch {
      /* ignore */
    }
  };

  const cls = ["msg", message.role, isVoice ? "has-voice" : ""].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      {!isSystem && (
        <div className="msg-meta">
          {isUser ? (
            <>
              <span className="name">{lang === "el" ? "Εσύ" : "You"}</span>
              {isVoice && <span>· {lang === "el" ? "φωνητικό" : "voice"}</span>}
            </>
          ) : (
            <>
              <span className="name">Praiser</span>
              <span>· {formatRelative(message.createdAt, lang)}</span>
            </>
          )}
        </div>
      )}
      <div className="msg-body">
        {message.content}
        {message.images && message.images.length > 0 && (
          <div className={"msg-images " + (message.images.length === 1 ? "single" : "")}>
            {message.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={img.url}
                alt={img.name || ""}
                onClick={() => onImageClick(img.url)}
              />
            ))}
          </div>
        )}
      </div>
      {!isUser && !isSystem && (
        <div className="msg-actions">
          <button className="msg-action" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={12} />
            {copied
              ? lang === "el"
                ? "αντιγράφηκε"
                : "copied"
              : lang === "el"
                ? "αντιγραφή"
                : "copy"}
          </button>
          <button className="msg-action" onClick={shareMsg}>
            <Icon name="share" size={12} />
            {lang === "el" ? "κοινοποίηση" : "share"}
          </button>
        </div>
      )}
    </div>
  );
};

export const Thinking = () => {
  const lang = useAppStore((s) => s.uiLanguage);
  return (
    <div className="thinking">
      <span className="thinking-dots">
        <span />
        <span />
        <span />
      </span>
      <span>{lang === "el" ? "Ο Praiser σκέφτεται…" : "Praiser is thinking…"}</span>
    </div>
  );
};
