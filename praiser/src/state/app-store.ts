import { create } from "zustand";

import { type Message, type PersonInfo, type Chat } from "@/lib/types";
import { nowIso } from "@/lib/utils";

type Language = "en" | "el";
export type PraiseMode = "auto-random" | "crescendo" | "manual";

type PersistedSettings = {
  version: number;
  personInfo: PersonInfo | null;
  praiseBarVisible: boolean;
  praiseMode: PraiseMode;
  manualPraiseVolume: number;
  siteName: string;
  siteSubtitle: string;
  chats: Chat[];
  autoSpeak: boolean;
  ttsVoiceUri: string | null;
  darkMode: boolean;
  showSubjectPanel: boolean;
};

type AppStore = {
  messages: Message[];
  personInfo: PersonInfo | null;
  praiseVolume: number;
  praiseBarVisible: boolean;
  praiseMode: PraiseMode;
  manualPraiseVolume: number;
  isProcessing: boolean;
  uiLanguage: Language;
  siteName: string;
  siteSubtitle: string;
  chatName: string;
  currentChatId: string | null;
  chats: Chat[];
  autoSpeak: boolean;
  ttsVoiceUri: string | null;
  liveMode: boolean;
  darkMode: boolean;
  showSubjectPanel: boolean;
  settingsOpen: boolean;
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
  setAutoSpeak: (value: boolean) => void;
  setTtsVoiceUri: (uri: string | null) => void;
  setLiveMode: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  setShowSubjectPanel: (value: boolean) => void;
  setSettingsOpen: (value: boolean) => void;
  saveCurrentChat: () => void;
  loadChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  newChat: () => void;
  reset: () => void;
};

const SETTINGS_VERSION = 2;
const MAX_CHATS = 50;
const CHATS_STORAGE_KEY = "praiser-chats";
const SETTINGS_CACHE_KEY = "praiser-settings-cache";
const SAVE_DEBOUNCE_MS = 500;
const SETTINGS_FETCH_TIMEOUT_MS = 8000;
const SETTINGS_SAVE_TIMEOUT_MS = 15000;

const DEFAULTS = {
  version: SETTINGS_VERSION,
  personInfo: null as PersonInfo | null,
  praiseBarVisible: false,
  praiseMode: "crescendo" as PraiseMode,
  manualPraiseVolume: 70,
  siteName: "Praiser",
  siteSubtitle: "AI Praise Assistant",
  chats: [] as Chat[],
  autoSpeak: false,
  ttsVoiceUri: null as string | null,
  darkMode: false,
  showSubjectPanel: true,
};

const withIds = (message: Omit<Message, "id" | "createdAt">): Message => ({
  ...message,
  id: crypto.randomUUID(),
  createdAt: nowIso(),
});

const isBrowser = () => typeof window !== "undefined";

const safeLocalStorage = {
  get: (key: string): string | null => {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // quota / private-mode — silent
    }
  },
  remove: (key: string) => {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // silent
    }
  },
};

const loadChatsFromCache = (): Chat[] => {
  const raw = safeLocalStorage.get(CHATS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveChatsToCache = (chats: Chat[]) => {
  safeLocalStorage.set(CHATS_STORAGE_KEY, JSON.stringify(chats));
};

const loadSettingsFromCache = (): Partial<PersistedSettings> | null => {
  const raw = safeLocalStorage.get(SETTINGS_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== SETTINGS_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveSettingsToCache = (settings: PersistedSettings) => {
  safeLocalStorage.set(SETTINGS_CACHE_KEY, JSON.stringify(settings));
};

const extractPersistedSettings = (state: AppStore): PersistedSettings => ({
  version: SETTINGS_VERSION,
  personInfo: state.personInfo,
  praiseBarVisible: state.praiseBarVisible,
  praiseMode: state.praiseMode,
  manualPraiseVolume: state.manualPraiseVolume,
  siteName: state.siteName,
  siteSubtitle: state.siteSubtitle,
  chats: state.chats,
  autoSpeak: state.autoSpeak,
  ttsVoiceUri: state.ttsVoiceUri,
  darkMode: state.darkMode,
  showSubjectPanel: state.showSubjectPanel,
});

const saveSettingsToAPI = async (settings: PersistedSettings): Promise<void> => {
  if (!isBrowser()) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SETTINGS_SAVE_TIMEOUT_MS);

  try {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`Settings save failed (${response.status}): ${detail}`);
      return;
    }

    // Cache successful payload locally too.
    saveSettingsToCache(settings);
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      console.warn("Settings save timed out");
    } else {
      console.warn("Settings save error:", error);
    }
  } finally {
    clearTimeout(timeoutId);
  }
};

const loadSettingsFromAPI = async (): Promise<PersistedSettings> => {
  if (!isBrowser()) return { ...DEFAULTS };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/settings?t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      return { ...DEFAULTS };
    }

    const data = await response.json();
    const raw = data?.settings;
    if (!raw || raw.version !== SETTINGS_VERSION) {
      return { ...DEFAULTS };
    }

    return {
      ...DEFAULTS,
      ...raw,
      version: SETTINGS_VERSION,
    };
  } catch {
    return { ...DEFAULTS };
  } finally {
    clearTimeout(timeoutId);
  }
};

let chatSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let settingsSaveTimeout: ReturnType<typeof setTimeout> | null = null;

const debounceChatSave = (fn: () => void) => {
  if (chatSaveTimeout) clearTimeout(chatSaveTimeout);
  chatSaveTimeout = setTimeout(fn, SAVE_DEBOUNCE_MS);
};

const clearChatSave = () => {
  if (chatSaveTimeout) {
    clearTimeout(chatSaveTimeout);
    chatSaveTimeout = null;
  }
};

const debounceSettingsSave = (getState: () => AppStore) => {
  if (settingsSaveTimeout) clearTimeout(settingsSaveTimeout);
  settingsSaveTimeout = setTimeout(() => {
    settingsSaveTimeout = null;
    void saveSettingsToAPI(extractPersistedSettings(getState()));
  }, SAVE_DEBOUNCE_MS);
};

const flushSettingsSave = (getState: () => AppStore) => {
  if (settingsSaveTimeout) {
    clearTimeout(settingsSaveTimeout);
    settingsSaveTimeout = null;
  }
  void saveSettingsToAPI(extractPersistedSettings(getState()));
};

// Build an initial state that mirrors the on-disk cache so first paint matches
// the persisted state. The API load (loadStoredSettings) reconciles after mount.
const buildInitialState = () => {
  const cached = loadSettingsFromCache();
  const cachedChats = loadChatsFromCache();
  return {
    messages: [] as Message[],
    personInfo: cached?.personInfo ?? DEFAULTS.personInfo,
    praiseVolume: 0,
    praiseBarVisible: cached?.praiseBarVisible ?? DEFAULTS.praiseBarVisible,
    praiseMode: cached?.praiseMode ?? DEFAULTS.praiseMode,
    manualPraiseVolume: cached?.manualPraiseVolume ?? DEFAULTS.manualPraiseVolume,
    isProcessing: false,
    uiLanguage: "en" as Language,
    siteName: cached?.siteName ?? DEFAULTS.siteName,
    siteSubtitle: cached?.siteSubtitle ?? DEFAULTS.siteSubtitle,
    chatName: "",
    currentChatId: null,
    chats: cached?.chats?.length ? cached.chats : cachedChats,
    autoSpeak: cached?.autoSpeak ?? DEFAULTS.autoSpeak,
    ttsVoiceUri: cached?.ttsVoiceUri ?? DEFAULTS.ttsVoiceUri,
    darkMode: cached?.darkMode ?? DEFAULTS.darkMode,
    showSubjectPanel: cached?.showSubjectPanel ?? DEFAULTS.showSubjectPanel,
    liveMode: false, // never persisted — ephemeral session flag
    settingsOpen: false,
  };
};

const buildChatFromState = (state: AppStore): Chat => {
  const chatName =
    state.chatName ||
    state.messages[0]?.content?.slice(0, 50) ||
    "New Chat";

  return {
    id: state.currentChatId || crypto.randomUUID(),
    name: chatName,
    messages: state.messages,
    createdAt: state.currentChatId
      ? state.chats.find((c) => c.id === state.currentChatId)?.createdAt || nowIso()
      : nowIso(),
    updatedAt: nowIso(),
  };
};

const mergeChat = (chats: Chat[], chat: Chat): Chat[] => {
  const idx = chats.findIndex((c) => c.id === chat.id);
  const next = idx >= 0
    ? chats.map((c, i) => (i === idx ? chat : c))
    : [chat, ...chats];
  return next.length > MAX_CHATS ? next.slice(0, MAX_CHATS) : next;
};

const shouldResetPraiseFor = (mode: PraiseMode) =>
  mode === "auto-random" || mode === "crescendo";

export const useAppStore = create<AppStore>((set, get) => ({
  ...buildInitialState(),

  addMessage: (message) =>
    set((state) => {
      const newMessages = [...state.messages, withIds(message)];
      debounceChatSave(() => get().saveCurrentChat());
      return { messages: newMessages };
    }),

  appendMessages: (messages) =>
    set((state) => {
      const newMessages = [...state.messages, ...messages.map(withIds)];
      debounceChatSave(() => get().saveCurrentChat());
      return { messages: newMessages };
    }),

  setPersonInfo: (info) => {
    set({ personInfo: info });
    debounceSettingsSave(get);
  },

  setPraiseVolume: (value) =>
    set({ praiseVolume: Math.min(100, Math.max(0, value)) }),

  setPraiseBarVisible: (visible) => {
    set({ praiseBarVisible: visible });
    debounceSettingsSave(get);
  },

  setPraiseMode: (mode) => {
    set({
      praiseMode: mode,
      praiseVolume: shouldResetPraiseFor(mode) ? 0 : 70,
    });
    debounceSettingsSave(get);
  },

  setManualPraiseVolume: (value) => {
    const clamped = Math.min(100, Math.max(0, value));
    set({ manualPraiseVolume: clamped });
    debounceSettingsSave(get);
  },

  setProcessing: (value) => set({ isProcessing: value }),

  setUiLanguage: (language) => set({ uiLanguage: language }),

  setSiteName: (name) => {
    set({ siteName: name });
    debounceSettingsSave(get);
  },

  setSiteSubtitle: (subtitle) => {
    set({ siteSubtitle: subtitle });
    debounceSettingsSave(get);
  },

  setChatName: (name) =>
    set((state) => {
      if (state.messages.length > 0) {
        debounceChatSave(() => get().saveCurrentChat());
      }
      return { chatName: name };
    }),

  saveCurrentChat: () => {
    const state = get();
    if (state.messages.length === 0) return;

    const chat = buildChatFromState(state);
    const updatedChats = mergeChat(state.chats, chat);

    saveChatsToCache(updatedChats);
    set({
      chats: updatedChats,
      currentChatId: chat.id,
      chatName: chat.name,
    });
    debounceSettingsSave(get);
  },

  loadChat: (chatId) => {
    const state = get();
    clearChatSave();

    if (state.messages.length > 0 && state.currentChatId) {
      state.saveCurrentChat();
    }

    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return;

    set({
      messages: chat.messages,
      currentChatId: chat.id,
      chatName: chat.name,
      isProcessing: false,
      praiseVolume: shouldResetPraiseFor(state.praiseMode) ? 0 : state.praiseVolume,
    });
  },

  deleteChat: (chatId) => {
    const state = get();
    const updatedChats = state.chats.filter((c) => c.id !== chatId);
    saveChatsToCache(updatedChats);

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
    debounceSettingsSave(get);
  },

  setAutoSpeak: (value) => {
    set({ autoSpeak: value });
    debounceSettingsSave(get);
  },

  setTtsVoiceUri: (uri) => {
    set({ ttsVoiceUri: uri });
    debounceSettingsSave(get);
  },

  setLiveMode: (value) => set({ liveMode: value }),

  setDarkMode: (value) => {
    set({ darkMode: value });
    if (typeof document !== "undefined") {
      if (value) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
    }
    safeLocalStorage.set("praiser-theme", value ? "dark" : "light");
    debounceSettingsSave(get);
  },

  setShowSubjectPanel: (value) => {
    set({ showSubjectPanel: value });
    debounceSettingsSave(get);
  },

  setSettingsOpen: (value) => set({ settingsOpen: value }),

  newChat: () => {
    const state = get();
    clearChatSave();

    let nextChats = state.chats;
    if (state.messages.length > 0) {
      const chat = buildChatFromState(state);
      nextChats = mergeChat(state.chats, chat);
      saveChatsToCache(nextChats);
    }

    set({
      messages: [],
      currentChatId: null,
      chatName: "",
      isProcessing: false,
      chats: nextChats,
      praiseVolume: shouldResetPraiseFor(state.praiseMode) ? 0 : 70,
    });

    if (state.messages.length > 0) {
      debounceSettingsSave(get);
    }
  },

  reset: () =>
    set({
      messages: [],
      personInfo: DEFAULTS.personInfo,
      praiseVolume: 0,
      praiseBarVisible: DEFAULTS.praiseBarVisible,
      praiseMode: DEFAULTS.praiseMode,
      manualPraiseVolume: DEFAULTS.manualPraiseVolume,
      isProcessing: false,
      uiLanguage: "en",
      siteName: DEFAULTS.siteName,
      siteSubtitle: DEFAULTS.siteSubtitle,
      chatName: "",
      currentChatId: null,
      chats: [],
      autoSpeak: DEFAULTS.autoSpeak,
      ttsVoiceUri: DEFAULTS.ttsVoiceUri,
      darkMode: DEFAULTS.darkMode,
      showSubjectPanel: DEFAULTS.showSubjectPanel,
      liveMode: false,
      settingsOpen: false,
    }),
}));

export const loadStoredSettings = async () => {
  if (!isBrowser()) return;

  const settings = await loadSettingsFromAPI();
  saveSettingsToCache(settings);
  saveChatsToCache(settings.chats);

  useAppStore.setState({
    personInfo: settings.personInfo,
    praiseBarVisible: settings.praiseBarVisible,
    praiseMode: settings.praiseMode,
    manualPraiseVolume: settings.manualPraiseVolume,
    siteName: settings.siteName,
    siteSubtitle: settings.siteSubtitle,
    chats: settings.chats,
    autoSpeak: settings.autoSpeak ?? DEFAULTS.autoSpeak,
    ttsVoiceUri: settings.ttsVoiceUri ?? DEFAULTS.ttsVoiceUri,
    darkMode: settings.darkMode ?? DEFAULTS.darkMode,
    showSubjectPanel: settings.showSubjectPanel ?? DEFAULTS.showSubjectPanel,
    praiseVolume: shouldResetPraiseFor(settings.praiseMode) ? 0 : 70,
  });

  if (typeof document !== "undefined") {
    if (settings.darkMode) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }
};

export const saveSettingsToServer = (immediate: boolean = false) => {
  if (immediate) {
    flushSettingsSave(useAppStore.getState);
  } else {
    debounceSettingsSave(useAppStore.getState);
  }
};
