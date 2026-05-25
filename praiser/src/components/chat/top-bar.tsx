"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useAppStore } from "@/state/app-store";

export const TopBar = () => {
  const lang = useAppStore((s) => s.uiLanguage);
  const setLang = useAppStore((s) => s.setUiLanguage);
  const chatName = useAppStore((s) => s.chatName);
  const setChatName = useAppStore((s) => s.setChatName);
  const newChat = useAppStore((s) => s.newChat);
  const messages = useAppStore((s) => s.messages);
  const personInfo = useAppStore((s) => s.personInfo);

  const [sharing, setSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const placeholder = lang === "el" ? "Νέα συνομιλία" : "New chat";

  const onShare = async () => {
    if (typeof window === "undefined" || sharing) return;
    setShareError(null);

    if (messages.length === 0) {
      setShareError(
        lang === "el"
          ? "Στείλε ένα μήνυμα πρώτα για να μοιραστείς."
          : "Send a message first to share.",
      );
      return;
    }
    if (!personInfo) {
      setShareError(
        lang === "el" ? "Πρόσθεσε πρόσωπο πρώτα." : "Add a person first.",
      );
      return;
    }

    setSharing(true);
    try {
      const response = await fetch("/api/chats/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat: {
            name: chatName || placeholder,
            messages,
          },
          person: {
            name: personInfo.name,
            extraInfo: personInfo.extraInfo,
            mode: personInfo.mode,
            images: personInfo.images,
          },
          language: lang,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Share failed");
      }
      const data: { shortcode: string } = await response.json();
      const url = `${window.location.origin}/c/${data.shortcode}`;
      setSharedUrl(url);
      // Best-effort: copy to clipboard + invoke native share.
      try {
        await navigator.clipboard?.writeText(url);
      } catch {
        /* clipboard may be denied */
      }
      if (navigator.share) {
        try {
          await navigator.share({ title: "Praiser", text: chatName || personInfo.name, url });
        } catch {
          /* user dismissed */
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Share failed";
      setShareError(msg);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <input
          className="chat-title"
          value={chatName}
          placeholder={placeholder}
          onChange={(e) => setChatName(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="topbar-right">
        {sharedUrl && (
          <a
            href={sharedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="label clay-text"
            style={{
              marginRight: 12,
              fontSize: 11,
              textDecoration: "none",
            }}
            title={sharedUrl}
          >
            {lang === "el" ? "Αντιγράφηκε ✓" : "Copied ✓"}
          </a>
        )}
        {shareError && (
          <span
            className="label"
            style={{ marginRight: 12, color: "var(--clay)", fontSize: 11 }}
            title={shareError}
          >
            !
          </span>
        )}
        <div className="lang-pill" role="tablist" aria-label="Language">
          <button className={lang === "el" ? "on" : ""} onClick={() => setLang("el")}>EL</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
        </div>
        <button className="icon-btn" aria-label="Share" onClick={onShare} disabled={sharing}>
          <Icon name="share" size={15} />
        </button>
        <button className="icon-btn" aria-label="New chat" onClick={() => newChat()}>
          <Icon name="refresh" size={15} />
        </button>
      </div>
    </div>
  );
};
