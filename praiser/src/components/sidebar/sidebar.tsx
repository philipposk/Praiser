"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useAppStore } from "@/state/app-store";

const formatRelativeTime = (iso: string, lang: "el" | "en") => {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMin = Math.floor((now - ts) / 60_000);

  if (lang === "el") {
    if (diffMin < 1) return "μόλις τώρα";
    if (diffMin < 60) return `πριν ${diffMin} ${diffMin === 1 ? "λεπτό" : "λεπτά"}`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `πριν ${diffHr} ${diffHr === 1 ? "ώρα" : "ώρες"}`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "χθες";
    if (diffDay < 7) return `${diffDay} ημέρες`;
    return new Date(iso).toLocaleDateString("el-GR", { day: "numeric", month: "short" });
  }
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days`;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

export const Sidebar = () => {
  const lang = useAppStore((s) => s.uiLanguage);
  const chats = useAppStore((s) => s.chats);
  const currentChatId = useAppStore((s) => s.currentChatId);
  const newChat = useAppStore((s) => s.newChat);
  const loadChat = useAppStore((s) => s.loadChat);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const [query, setQuery] = useState("");

  const T = lang === "el"
    ? { newChat: "Νέα συνομιλία", search: "Αναζήτηση συνομιλιών", history: "Ιστορικό", settings: "Ρυθμίσεις", account: "Λογαριασμός", empty: "Καμία συνομιλία ακόμα" }
    : { newChat: "New chat", search: "Search chats", history: "History", settings: "Settings", account: "Account", empty: "No chats yet" };

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.toLowerCase();
    return chats.filter((c) => c.name.toLowerCase().includes(q));
  }, [chats, query]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">praiser<em>.</em></span>
      </div>

      <button className="new-chat" onClick={() => newChat()}>
        <Icon name="plus" size={15} />
        <span>{T.newChat}</span>
      </button>

      <div className="search">
        <Icon name="search" size={14} />
        <input
          placeholder={T.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        className="side-section"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", marginRight: -8, paddingRight: 8 }}
      >
        <div className="side-section-header">
          <span className="label">{T.history}</span>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "10px", fontSize: 12, color: "var(--muted-2)" }}>
            {T.empty}
          </div>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            className={"chat-item " + (c.id === currentChatId ? "active" : "")}
            onClick={() => loadChat(c.id)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-item-title">{c.name}</div>
              <div className="chat-item-meta">{formatRelativeTime(c.updatedAt, lang)}</div>
            </div>
            <button
              className="chat-item-delete"
              aria-label="Delete chat"
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(c.id);
              }}
            >
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="side-footer">
        <button className="side-link" onClick={() => setSettingsOpen(true)}>
          <Icon name="settings" size={14} />
          {T.settings}
        </button>
        <button className="side-link">
          <Icon name="user" size={14} />
          {T.account}
        </button>
      </div>
    </aside>
  );
};
