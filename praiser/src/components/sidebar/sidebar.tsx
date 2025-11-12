"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Clock, User, Trash2, Pencil, FileText, Check, X } from "lucide-react";
import { useAppStore } from "@/state/app-store";
import { useTranslation } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { DownloadAppModal } from "@/components/download-app/download-app-modal";

// Detect platform for keyboard shortcut display
const useKeyboardShortcut = () => {
  const [shortcut, setShortcut] = useState<string>("⌘K");
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform) || 
                  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      setShortcut(""); // Hide on mobile
    } else if (isMac) {
      setShortcut("⌘K");
    } else {
      setShortcut("Ctrl+K");
    }
  }, []);
  
  return shortcut;
};

export const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const uiLanguage = useAppStore((state) => state.uiLanguage);
  const siteName = useAppStore((state) => state.siteName);
  const t = useTranslation(uiLanguage);
  const chats = useAppStore((state) => state.chats);
  const currentChatId = useAppStore((state) => state.currentChatId);
  const messages = useAppStore((state) => state.messages);
  const chatName = useAppStore((state) => state.chatName);
  const setChatName = useAppStore((state) => state.setChatName);
  const newChat = useAppStore((state) => state.newChat);
  const loadChat = useAppStore((state) => state.loadChat);
  const deleteChat = useAppStore((state) => state.deleteChat);
  const keyboardShortcut = useKeyboardShortcut();
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMenuChatId, setShowMenuChatId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get first letter of site name for logo (preserve case)
  const logoLetter = siteName.trim() ? siteName.trim().charAt(0) : "M";

  const handleNewChat = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    newChat();
    // Close sidebar on mobile after creating new chat
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleChatClick = (chatId: string) => {
    loadChat(chatId);
    // Close sidebar on mobile after selecting a chat
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      deleteChat(chatId);
      setShowMenuChatId(null);
    }
  };

  const handleEditChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setEditingChatId(chatId);
      setRenameValue(chat.name);
      setShowMenuChatId(null);
    }
  };

  const handleRenameSave = (chatId: string) => {
    if (renameValue.trim()) {
      const newName = renameValue.trim();
      // Update the chat in the store
      const updatedChats = chats.map(chat => 
        chat.id === chatId ? { ...chat, name: newName } : chat
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("praiser-chats", JSON.stringify(updatedChats));
      }
      useAppStore.setState({ chats: updatedChats });
      
      // If this is the current chat, update the chat name in the store
      if (chatId === currentChatId) {
        setChatName(newName);
      }
    }
    setEditingChatId(null);
    setRenameValue("");
  };

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setRenameValue("");
  };

  const handleExportChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.messages.length === 0) {
      alert("No messages to export");
      return;
    }

    const chatTitle = chat.name || "Chat Export";
    let exportText = `${chatTitle}\n${"=".repeat(chatTitle.length)}\n\n`;

    chat.messages.forEach((message) => {
      const role = message.role === "user" ? "You" : "Assistant";
      const timestamp = new Date(message.createdAt).toLocaleString();
      exportText += `[${role}] - ${timestamp}\n`;
      exportText += `${message.content}\n\n`;
    });

    const blob = new Blob([exportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chatTitle.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenuChatId(null);
  };

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingChatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingChatId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuChatId(null);
      }
    };

    if (showMenuChatId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenuChatId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Mark as mounted after hydration to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/5 bg-black/40 lg:bg-black/40 backdrop-blur-xl z-40">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/5">
        <div 
          className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-white font-calligraphic" 
          style={{ 
            fontFamily: 'var(--font-kalam), cursive', 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
            paddingTop: '1px',
            paddingLeft: '0.5px'
          }}
        >
          {logoLetter}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="border-b border-white/5 p-3 space-y-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
          {keyboardShortcut && (
            <span className="ml-auto text-xs text-white/40">{keyboardShortcut}</span>
          )}
        </button>
        <DownloadAppModal />
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wider text-white/40">
          <Clock className="h-3 w-3" />
          <span>Chat History</span>
        </div>
        {!isMounted ? (
          // Show placeholder during SSR to match initial client render
          <p className="px-2 text-xs text-white/40">No chat history</p>
        ) : chats.length > 0 ? (
          <div className="space-y-1">
            {chats.map((chat) => {
              const isActive = chat.id === currentChatId;
              const isHovered = hoveredChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                >
                  {editingChatId === chat.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameSave(chat.id);
                          } else if (e.key === "Escape") {
                            handleRenameCancel();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-white/10 text-sm text-white focus:text-white focus:outline-none border border-white/20 rounded px-2 py-1"
                        placeholder="Chat name"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameSave(chat.id);
                        }}
                        className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                        aria-label="Save"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameCancel();
                        }}
                        className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                        aria-label="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleChatClick(chat.id)}
                        className="flex-1 text-left truncate"
                      >
                        <div className="truncate font-medium">{chat.name}</div>
                        <div className="text-xs text-white/40">{formatDate(chat.updatedAt)}</div>
                      </button>
                      {(isHovered || isActive) && (
                        <div className="relative flex items-center gap-1" ref={menuRef}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenuChatId(showMenuChatId === chat.id ? null : chat.id);
                            }}
                            className="flex items-center justify-center rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                            aria-label="Chat options"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {showMenuChatId === chat.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl z-50">
                              <div className="p-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditChat(e, chat.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportChat(chat.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Export</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteChat(e, chat.id)}
                                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-rose-400 transition hover:bg-white/10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2 text-xs text-white/40">No chat history</p>
        )}
      </div>

      {/* User Profile */}
      <div className="border-t border-white/5 p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-white">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white">User</p>
            <p className="text-xs text-white/40">Free Plan</p>
          </div>
        </button>
      </div>
    </aside>
  );
};

