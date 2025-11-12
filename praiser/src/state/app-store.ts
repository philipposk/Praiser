import { create } from "zustand";

import { type Message, type PersonInfo, type Chat } from "@/lib/types";
import { nowIso } from "@/lib/utils";

type Language = "en" | "el";
export type PraiseMode = "auto-random" | "crescendo" | "manual";

type AppStore = {
  messages: Message[];
  personInfo: PersonInfo | null;
  praiseVolume: number;
  praiseBarVisible: boolean;
  praiseMode: PraiseMode;
  manualPraiseVolume: number; // For manual mode when bar is hidden
  isProcessing: boolean;
  uiLanguage: Language;
  siteName: string;
  siteSubtitle: string;
  chatName: string;
  currentChatId: string | null;
  chats: Chat[];
  addMessage: (message: Omit<Message, "id" | "createdAt">) => void;
  appendMessages: (messages: Omit<Message, "id" | "createdAt">[]) => void;
  setPersonInfo: (info: PersonInfo | null) => void;
  setPraiseVolume: (value: number) => void;
  setPraiseBarVisible: (visible: boolean) => void;
  setPraiseMode: (mode: PraiseMode) => void;
  setManualPraiseVolume: (value: number) => void;
  setProcessing: (value: boolean) => void;
  setUiLanguage: (language: Language) => void;
  setSiteName: (name: string) => void;
  setSiteSubtitle: (subtitle: string) => void;
  setChatName: (name: string) => void;
  saveCurrentChat: () => void;
  loadChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  newChat: () => void;
  reset: () => void;
};

const withIds = (message: Omit<Message, "id" | "createdAt">): Message => ({
  ...message,
  id: crypto.randomUUID(),
  createdAt: nowIso(),
});

const STORAGE_KEY = "praiser-chats";

// Load chats from localStorage
const loadChatsFromStorage = (): Chat[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading chats from storage:", error);
  }
  return [];
};

// Save chats to localStorage
const saveChatsToStorage = (chats: Chat[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Error saving chats to storage:", error);
  }
};

// Debounce helper for auto-save
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSave = (saveFn: () => void, delay: number = 500) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(saveFn, delay);
};

// Clear any pending debounced saves
const clearPendingSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
};

export const useAppStore = create<AppStore>((set, get) => ({
  messages: [],
  personInfo: null,
  praiseVolume: 70,
  praiseBarVisible: true, // Default, will be loaded from localStorage on client
  praiseMode: "manual", // Default, will be loaded from localStorage on client
  manualPraiseVolume: 70, // Default, will be loaded from localStorage on client
  isProcessing: false,
  uiLanguage: "en",
  siteName: "Mike's Chatbot",
  chatName: "",
  siteSubtitle: "Powered by AI",
  currentChatId: null,
  chats: loadChatsFromStorage(),
  addMessage: (message) =>
    set((state) => {
      const newMessages = [...state.messages, withIds(message)];
      // Auto-save after adding message (debounced)
      debouncedSave(() => {
        get().saveCurrentChat();
      });
      return { messages: newMessages };
    }),
  appendMessages: (messages) =>
    set((state) => {
      const newMessages = [...state.messages, ...messages.map(withIds)];
      // Auto-save after appending messages (debounced)
      debouncedSave(() => {
        get().saveCurrentChat();
      });
      return { messages: newMessages };
    }),
  setPersonInfo: (info) =>
    set(() => ({
      personInfo: info,
    })),
  setPraiseVolume: (value) =>
    set(() => ({
      praiseVolume: Math.min(100, Math.max(0, value)),
    })),
  setPraiseBarVisible: (visible) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("praiser-praiseBarVisible", String(visible));
      } catch (error) {
        console.error("Error saving praiseBarVisible to localStorage:", error);
      }
    }
    set(() => ({
      praiseBarVisible: visible,
    }));
  },
  setPraiseMode: (mode) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("praiser-praiseMode", mode);
      } catch (error) {
        console.error("Error saving praiseMode to localStorage:", error);
      }
    }
    set(() => ({
      praiseMode: mode,
      // Reset volume when switching modes
      praiseVolume: mode === "auto-random" || mode === "crescendo" ? 0 : 70,
    }));
  },
  setManualPraiseVolume: (value) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("praiser-manualPraiseVolume", String(clampedValue));
      } catch (error) {
        console.error("Error saving manualPraiseVolume to localStorage:", error);
      }
    }
    set(() => ({
      manualPraiseVolume: clampedValue,
    }));
  },
  setProcessing: (value) =>
    set(() => ({
      isProcessing: value,
    })),
  setUiLanguage: (language) =>
    set(() => ({
      uiLanguage: language,
    })),
  setSiteName: (name) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("praiser-siteName", name);
      } catch (error) {
        console.error("Error saving siteName to localStorage:", error);
      }
    }
    set(() => ({
      siteName: name, // Allow spaces, don't trim
    }));
  },
  setSiteSubtitle: (subtitle) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("praiser-siteSubtitle", subtitle);
      } catch (error) {
        console.error("Error saving siteSubtitle to localStorage:", error);
      }
    }
    set(() => ({
      siteSubtitle: subtitle,
    }));
  },
  setChatName: (name) =>
    set((state) => {
      // Auto-save when chat name changes (if there are messages)
      if (state.messages.length > 0) {
        debouncedSave(() => {
          get().saveCurrentChat();
        });
      }
      return { chatName: name };
    }),
  saveCurrentChat: () => {
    const state = get();
    if (state.messages.length === 0) return; // Don't save empty chats
    
    const chatName = state.chatName || 
      state.messages[0]?.content?.slice(0, 50) || 
      "New Chat";
    
    const chat: Chat = {
      id: state.currentChatId || crypto.randomUUID(),
      name: chatName,
      messages: state.messages,
      createdAt: state.currentChatId 
        ? state.chats.find(c => c.id === state.currentChatId)?.createdAt || nowIso()
        : nowIso(),
      updatedAt: nowIso(),
    };
    
    const existingIndex = state.chats.findIndex(c => c.id === chat.id);
    let updatedChats: Chat[];
    
    if (existingIndex >= 0) {
      // Update existing chat
      updatedChats = [...state.chats];
      updatedChats[existingIndex] = chat;
    } else {
      // Add new chat (prepend to show newest first)
      updatedChats = [chat, ...state.chats];
    }
    
    // Keep only last 50 chats
    if (updatedChats.length > 50) {
      updatedChats = updatedChats.slice(0, 50);
    }
    
    saveChatsToStorage(updatedChats);
    set({ 
      chats: updatedChats,
      currentChatId: chat.id,
      chatName: chat.name,
    });
  },
  loadChat: (chatId: string) => {
    const state = get();
    // Clear any pending debounced saves
    clearPendingSave();
    
    // Save current chat before loading another (synchronous)
    if (state.messages.length > 0 && state.currentChatId) {
      state.saveCurrentChat();
    }
    
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
      // Reset praise volume to 0 for auto-random and crescendo modes when loading a chat
      const shouldResetPraise = state.praiseMode === "auto-random" || state.praiseMode === "crescendo";
      set({
        messages: chat.messages,
        currentChatId: chat.id,
        chatName: chat.name,
        isProcessing: false,
        praiseVolume: shouldResetPraise ? 0 : state.praiseVolume,
      });
    }
  },
  deleteChat: (chatId: string) => {
    const state = get();
    const updatedChats = state.chats.filter(c => c.id !== chatId);
    saveChatsToStorage(updatedChats);
    
    // If deleting current chat, clear it
    if (state.currentChatId === chatId) {
      set({
        messages: [],
        currentChatId: null,
        chatName: "",
        chats: updatedChats,
      });
    } else {
      set({ chats: updatedChats });
    }
  },
  newChat: () => {
    const state = get();
    
    // Clear any pending debounced saves to prevent saving empty chat
    clearPendingSave();
    
    // Save current chat before creating new one (synchronous)
    // We need to save it first, then clear
    if (state.messages.length > 0) {
      // Get the chat data before clearing
      const chatName = state.chatName || 
        state.messages[0]?.content?.slice(0, 50) || 
        "New Chat";
      
      const chat: Chat = {
        id: state.currentChatId || crypto.randomUUID(),
        name: chatName,
        messages: state.messages,
        createdAt: state.currentChatId 
          ? state.chats.find(c => c.id === state.currentChatId)?.createdAt || nowIso()
          : nowIso(),
        updatedAt: nowIso(),
      };
      
      const existingIndex = state.chats.findIndex(c => c.id === chat.id);
      let updatedChats: Chat[];
      
      if (existingIndex >= 0) {
        updatedChats = [...state.chats];
        updatedChats[existingIndex] = chat;
      } else {
        updatedChats = [chat, ...state.chats];
      }
      
      if (updatedChats.length > 50) {
        updatedChats = updatedChats.slice(0, 50);
      }
      
      saveChatsToStorage(updatedChats);
      
      // Now clear messages and reset in a single update
      // Reset praise volume to 0 for auto-random and crescendo modes, otherwise keep at 70
      const shouldResetPraise = state.praiseMode === "auto-random" || state.praiseMode === "crescendo";
      set((prevState) => ({
        messages: [],
        personInfo: prevState.personInfo,
        praiseBarVisible: prevState.praiseBarVisible,
        praiseMode: prevState.praiseMode,
        manualPraiseVolume: prevState.manualPraiseVolume,
        uiLanguage: prevState.uiLanguage,
        siteName: prevState.siteName,
        siteSubtitle: prevState.siteSubtitle,
        praiseVolume: shouldResetPraise ? 0 : 70,
        isProcessing: false,
        currentChatId: null,
        chatName: "",
        chats: updatedChats,
      }));
    } else {
      // No messages to save, just clear
      // Reset praise volume to 0 for auto-random and crescendo modes, otherwise keep at 70
      const shouldResetPraise = state.praiseMode === "auto-random" || state.praiseMode === "crescendo";
      set((prevState) => ({
        messages: [],
        currentChatId: null,
        chatName: "",
        isProcessing: false,
        praiseVolume: shouldResetPraise ? 0 : 70,
      }));
    }
  },
  reset: () =>
    set(() => ({
      messages: [],
      personInfo: null,
      praiseVolume: 70,
      praiseBarVisible: true,
      praiseMode: "manual",
      manualPraiseVolume: 70,
      isProcessing: false,
      uiLanguage: "en",
      siteName: "Mike's Chatbot",
      siteSubtitle: "Powered by AI",
      chatName: "",
      currentChatId: null,
      chats: [],
    })),
}));

// Load from localStorage on client side to avoid hydration mismatch
// This will be called after component mount
export const loadStoredSettings = () => {
  if (typeof window === "undefined") return;
  
  try {
    const storedPraiseBarVisible = localStorage.getItem("praiser-praiseBarVisible");
    const storedPraiseMode = localStorage.getItem("praiser-praiseMode");
    const storedManualPraiseVolume = localStorage.getItem("praiser-manualPraiseVolume");
    const storedSiteName = localStorage.getItem("praiser-siteName");
    const storedSiteSubtitle = localStorage.getItem("praiser-siteSubtitle");
    
    if (storedPraiseBarVisible !== null) {
      useAppStore.setState({ praiseBarVisible: storedPraiseBarVisible === "true" });
    }
    if (storedPraiseMode) {
      const praiseMode = storedPraiseMode as PraiseMode;
      useAppStore.setState({ praiseMode });
      // Reset praise volume to 0 for auto-random and crescendo modes on page load
      if (praiseMode === "auto-random" || praiseMode === "crescendo") {
        useAppStore.setState({ praiseVolume: 0 });
      }
    }
    if (storedManualPraiseVolume) {
      useAppStore.setState({ manualPraiseVolume: parseInt(storedManualPraiseVolume, 10) });
    }
    if (storedSiteName) {
      useAppStore.setState({ siteName: storedSiteName });
    }
    if (storedSiteSubtitle) {
      useAppStore.setState({ siteSubtitle: storedSiteSubtitle });
    }
  } catch (error) {
    console.error("Error loading settings from localStorage:", error);
  }
  }
  
  // Load chats from storage
  const chats = loadChatsFromStorage();
  useAppStore.setState({ chats });
};
