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

// Save all settings to API
const saveSettingsToAPI = async (settings: {
  personInfo: PersonInfo | null;
  praiseBarVisible: boolean;
  praiseMode: PraiseMode;
  manualPraiseVolume: number;
  siteName: string;
  siteSubtitle: string;
  chats: Chat[];
}) => {
  if (typeof window === "undefined") return;
  
  try {
    console.log("Saving settings to API...", {
      personInfo: settings.personInfo ? "present" : "null",
      praiseBarVisible: settings.praiseBarVisible,
      praiseMode: settings.praiseMode,
      siteName: settings.siteName,
      chatsCount: settings.chats.length,
    });
    
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ settings }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error saving settings to API:", response.status, response.statusText, errorText);
      // Don't throw - allow localStorage to still work as fallback
      console.warn("Settings saved to localStorage as fallback");
      return;
    }
    
    const result = await response.json();
    console.log("Settings saved successfully to API:", result);
    
    // Store the blob URL if provided (for faster future loads)
    if (result.url && typeof window !== "undefined") {
      try {
        localStorage.setItem("praiser-settings-blob-url", result.url);
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  } catch (error) {
    console.error("Error saving settings to API:", error);
    // Don't throw - allow localStorage to still work as fallback
    console.warn("Settings saved to localStorage as fallback");
  }
};

// Default settings to use when no API settings exist
const DEFAULT_SETTINGS = {
  personInfo: {
    name: "Άδωνης Γεωργίαδης",
    images: [],
    videos: [],
    urls: [
      "https://www.adonisgeorgiadis.gr",
      "https://en.wikipedia.org/wiki/Adonis_Georgiadis",
      "https://nd.gr/georgiadis-spyridon-adonis"
    ],
    extraInfo: "Σπυρίδων-Άδωνις Γεωργιάδης (nickname: μπουμπούκος) - Greek politician born November 6, 1972 in Athens. Minister of Development and Investments. Vice President of New Democracy party. Former Minister of Health (2013-2014). Historian and publisher. Graduated from the Department of History and Archaeology, School of Philosophy, National and Kapodistrian University of Athens. Founded the publishing house Georgiadis and the Center for Free Studies 'Greek Education' (Ελληνική Αγωγή). Married to Eugenia Manolidou, two children."
  },
  praiseBarVisible: true,
  praiseMode: "manual" as PraiseMode,
  manualPraiseVolume: 70,
  siteName: "Praiser",
  siteSubtitle: "AI Praise Assistant",
  chats: [],
};

// Load settings from API
const loadSettingsFromAPI = async (): Promise<{
  personInfo: PersonInfo | null;
  praiseBarVisible: boolean;
  praiseMode: PraiseMode;
  manualPraiseVolume: number;
  siteName: string;
  siteSubtitle: string;
  chats: Chat[];
}> => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  
  try {
    console.log("Loading settings from API...");
    
    // Try to fetch with cache busting to get fresh settings
    const response = await fetch("/api/settings?" + Date.now(), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    
    if (!response.ok) {
      // 404 is expected if no settings exist yet - return defaults
      if (response.status === 404) {
        console.log("No settings found in API (first time use) - using defaults");
        return DEFAULT_SETTINGS;
      }
      console.error("Error loading settings from API:", response.status, response.statusText, "- using defaults");
      return DEFAULT_SETTINGS;
    }
    
    const data = await response.json();
    if (data.settings) {
      console.log("Settings loaded from API:", {
        personInfo: data.settings.personInfo ? "present" : "null",
        praiseBarVisible: data.settings.praiseBarVisible,
        praiseMode: data.settings.praiseMode,
        siteName: data.settings.siteName,
        chatsCount: data.settings.chats?.length || 0,
      });
      // Merge with defaults to ensure all fields are present
      return {
        ...DEFAULT_SETTINGS,
        ...data.settings,
      };
    } else {
      console.log("No settings in API response - using defaults");
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("Error loading settings from API:", error, "- using defaults");
    return DEFAULT_SETTINGS;
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

// Debounced save settings to API
let settingsSaveTimeout: NodeJS.Timeout | null = null;
const debouncedSaveSettings = (getState: () => AppStore, delay: number = 500) => {
  if (settingsSaveTimeout) {
    clearTimeout(settingsSaveTimeout);
  }
  settingsSaveTimeout = setTimeout(() => {
    const state = getState();
    saveSettingsToAPI({
      personInfo: state.personInfo,
      praiseBarVisible: state.praiseBarVisible,
      praiseMode: state.praiseMode,
      manualPraiseVolume: state.manualPraiseVolume,
      siteName: state.siteName,
      siteSubtitle: state.siteSubtitle,
      chats: state.chats,
    }).catch((error) => {
      console.error("Failed to save settings to API:", error);
    });
  }, delay);
};

// Immediate save (no debounce) - for critical actions
const immediateSaveSettings = (getState: () => AppStore) => {
  // Clear any pending debounced save
  if (settingsSaveTimeout) {
    clearTimeout(settingsSaveTimeout);
    settingsSaveTimeout = null;
  }
  // Save immediately
  const state = getState();
  saveSettingsToAPI({
    personInfo: state.personInfo,
    praiseBarVisible: state.praiseBarVisible,
    praiseMode: state.praiseMode,
    manualPraiseVolume: state.manualPraiseVolume,
    siteName: state.siteName,
    siteSubtitle: state.siteSubtitle,
    chats: state.chats,
  }).catch((error) => {
    console.error("Failed to save settings to API:", error);
  });
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
  setPersonInfo: (info) => {
    if (typeof window !== "undefined") {
      try {
        if (info) {
          localStorage.setItem("praiser-personInfo", JSON.stringify(info));
        } else {
          localStorage.removeItem("praiser-personInfo");
        }
      } catch (error) {
        console.error("Error saving personInfo to localStorage:", error);
      }
    }
    set(() => ({
      personInfo: info,
    }));
    // Save to API (debounced)
    debouncedSaveSettings(get);
  },
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
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
        console.log("Saved siteName to localStorage:", name);
      } catch (error) {
        console.error("Error saving siteName to localStorage:", error);
      }
    }
    set(() => ({
      siteName: name, // Allow spaces, don't trim
    }));
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
    // Save to API (debounced)
    debouncedSaveSettings(get);
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
      // Save to API (debounced)
      debouncedSaveSettings(get);
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

// Load from API (always) - API returns defaults if no settings exist
// This will be called after component mount
// localStorage is only used as a write-through cache
export const loadStoredSettings = async () => {
  if (typeof window === "undefined") return;
  
  console.log("🔄 loadStoredSettings: Starting to load settings from API...");
  
  try {
    // ALWAYS load from API - it will return defaults if no settings exist
    // This ensures all users (including incognito) get the same settings
    const apiSettings = await loadSettingsFromAPI();
    
    console.log("✅ loadStoredSettings: Settings loaded from API, applying to store...");
    
    // Build updates object
    const updates: Partial<AppStore> = {
      personInfo: apiSettings.personInfo,
      praiseBarVisible: apiSettings.praiseBarVisible,
      praiseMode: apiSettings.praiseMode,
      manualPraiseVolume: apiSettings.manualPraiseVolume,
      siteName: apiSettings.siteName,
      siteSubtitle: apiSettings.siteSubtitle,
      chats: apiSettings.chats,
    };
    
    // Reset praise volume for auto modes
    if (apiSettings.praiseMode === "auto-random" || apiSettings.praiseMode === "crescendo") {
      updates.praiseVolume = 0;
    }
    
    // Save to localStorage as a cache (for faster subsequent loads)
    // This is a write-through cache - API is always the source of truth
    try {
      if (apiSettings.personInfo) {
        localStorage.setItem("praiser-personInfo", JSON.stringify(apiSettings.personInfo));
      } else {
        localStorage.removeItem("praiser-personInfo");
      }
      localStorage.setItem("praiser-praiseBarVisible", String(apiSettings.praiseBarVisible));
      localStorage.setItem("praiser-praiseMode", apiSettings.praiseMode);
      localStorage.setItem("praiser-manualPraiseVolume", String(apiSettings.manualPraiseVolume));
      localStorage.setItem("praiser-siteName", apiSettings.siteName);
      localStorage.setItem("praiser-siteSubtitle", apiSettings.siteSubtitle);
      saveChatsToStorage(apiSettings.chats);
    } catch (e) {
      // Ignore localStorage errors (incognito mode, quota exceeded, etc.)
      console.warn("⚠️ Could not cache settings to localStorage:", e);
    }
    
    // Apply all updates at once
    console.log("✅ Applying settings from API:", {
      praiseBarVisible: updates.praiseBarVisible,
      praiseMode: updates.praiseMode,
      siteName: updates.siteName,
      chatsCount: updates.chats?.length || 0,
    });
    useAppStore.setState(updates);
    console.log("✅ Settings successfully loaded from API and applied!");
  } catch (error) {
    console.error("❌ Error loading settings from API:", error);
    // If API fails, we already returned defaults from loadSettingsFromAPI
    // So this should never happen, but log it for debugging
  }
};

// Export function to save settings to API (for use outside the store)
// Must be defined after useAppStore is created
export const saveSettingsToServer = (immediate: boolean = false) => {
  const state = useAppStore.getState();
  if (immediate) {
    immediateSaveSettings(() => state);
  } else {
    debouncedSaveSettings(() => state, 500);
  }
};
