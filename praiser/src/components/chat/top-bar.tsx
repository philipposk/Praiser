"use client";

import { Icon } from "@/components/ui/icon";
import { useAppStore } from "@/state/app-store";

export const TopBar = () => {
  const lang = useAppStore((s) => s.uiLanguage);
  const setLang = useAppStore((s) => s.setUiLanguage);
  const chatName = useAppStore((s) => s.chatName);
  const setChatName = useAppStore((s) => s.setChatName);
  const newChat = useAppStore((s) => s.newChat);

  const placeholder = lang === "el" ? "Νέα συνομιλία" : "New chat";

  const onShare = async () => {
    if (typeof navigator === "undefined") return;
    const text = chatName || placeholder;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Praiser", text });
      } else {
        await navigator.clipboard?.writeText(text);
      }
    } catch {
      // user cancelled or unsupported
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
        <div className="lang-pill" role="tablist" aria-label="Language">
          <button className={lang === "el" ? "on" : ""} onClick={() => setLang("el")}>EL</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
        </div>
        <button className="icon-btn" aria-label="Share" onClick={onShare}>
          <Icon name="share" size={15} />
        </button>
        <button className="icon-btn" aria-label="New chat" onClick={() => newChat()}>
          <Icon name="refresh" size={15} />
        </button>
      </div>
    </div>
  );
};
