import { create } from "zustand";

import { type Message, type PersonInfo, type Chat, type ChatMode } from "@/lib/types";
import { nowIso } from "@/lib/utils";

type Language = "en" | "el";
export type PraiseMode = "auto-random" | "crescendo" | "manual";

type PersistedSettings = {
  version: number;
  /** Legacy field — first load migrates it into `persons`. */
  personInfo?: PersonInfo | null;
  persons: PersonInfo[];
  currentPersonId: string | null;
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
  persons: PersonInfo[];
  currentPersonId: string | null;
  /** Derived: the active person (null if none). */
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
  /** Mode used by EmptyState when no person is loaded yet (set by alias routes like /roast). */
  startMode: ChatMode;
  addMessage: (message: Omit<Message, "id" | "createdAt">) => string;
  appendMessages: (messages: Omit<Message, "id" | "createdAt">[]) => void;
  appendToMessageContent: (id: string, delta: string) => void;
  setPersonInfo: (info: PersonInfo | null) => void;
  addPerson: (person: Omit<PersonInfo, "id">) => string;
  updatePerson: (id: string, patch: Partial<PersonInfo>) => void;
  removePerson: (id: string) => void;
  setCurrentPerson: (id: string | null) => void;
  setPersonMode: (id: string, mode: ChatMode) => void;
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
  setStartMode: (mode: ChatMode) => void;
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
  persons: [] as PersonInfo[],
  currentPersonId: null as string | null,
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

/**
 * Convert a legacy single-person config + optional persons[] into a normalised
 * persons[] + currentPersonId pair. Adds id + mode defaults to anything missing
 * them. Safe to call repeatedly.
 */
const migratePersons = (raw: {
  personInfo?: PersonInfo | null;
  persons?: PersonInfo[];
  currentPersonId?: string | null;
}): { persons: PersonInfo[]; currentPersonId: string | null } => {
  const stamped: PersonInfo[] = [];
  for (const p of raw.persons ?? []) {
    if (!p) continue;
    stamped.push({
      ...p,
      id: p.id ?? crypto.randomUUID(),
      mode: p.mode ?? "praise",
    });
  }
  if (raw.personInfo) {
    const legacyId = raw.personInfo.id ?? crypto.randomUUID();
    const exists = stamped.some((p) => p.id === legacyId);
    if (!exists) {
      stamped.unshift({
        ...raw.personInfo,
        id: legacyId,
        mode: raw.personInfo.mode ?? "praise",
      });
    }
  }
  const explicit = raw.currentPersonId
    ? stamped.find((p) => p.id === raw.currentPersonId)?.id
    : null;
  const currentPersonId = explicit ?? stamped[0]?.id ?? null;
  return { persons: stamped, currentPersonId };
};

const findCurrentPerson = (
  persons: PersonInfo[],
  currentPersonId: string | null,
): PersonInfo | null =>
  currentPersonId ? (persons.find((p) => p.id === currentPersonId) ?? null) : null;

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
  persons: state.persons,
  currentPersonId: state.currentPersonId,
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

    const migrated = migratePersons({
      personInfo: raw.personInfo,
      persons: raw.persons,
      currentPersonId: raw.currentPersonId,
    });

    return {
      ...DEFAULTS,
      ...raw,
      persons: migrated.persons,
      currentPersonId: migrated.currentPersonId,
      personInfo: undefined,
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

// SSR-safe initial state: always DEFAULTS, regardless of environment. Cache
// + API hydration happens in loadStoredSettings() on mount. This avoids
// hydration mismatch between server (no localStorage) and client (cached).
const buildInitialState = () => ({
  messages: [] as Message[],
  persons: [] as PersonInfo[],
  currentPersonId: null as string | null,
  personInfo: null as PersonInfo | null,
  praiseVolume: 0,
  praiseBarVisible: DEFAULTS.praiseBarVisible,
  praiseMode: DEFAULTS.praiseMode,
  manualPraiseVolume: DEFAULTS.manualPraiseVolume,
  isProcessing: false,
  uiLanguage: "en" as Language,
  siteName: DEFAULTS.siteName,
  siteSubtitle: DEFAULTS.siteSubtitle,
  chatName: "",
  currentChatId: null,
  chats: [] as Chat[],
  autoSpeak: DEFAULTS.autoSpeak,
  ttsVoiceUri: DEFAULTS.ttsVoiceUri,
  darkMode: DEFAULTS.darkMode,
  showSubjectPanel: DEFAULTS.showSubjectPanel,
  liveMode: false,
  settingsOpen: false,
  startMode: "praise" as ChatMode,
});

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

  addMessage: (message) => {
    const next = withIds(message);
    set((state) => ({ messages: [...state.messages, next] }));
    debounceChatSave(() => get().saveCurrentChat());
    return next.id;
  },

  appendMessages: (messages) =>
    set((state) => {
      const newMessages = [...state.messages, ...messages.map(withIds)];
      debounceChatSave(() => get().saveCurrentChat());
      return { messages: newMessages };
    }),

  appendToMessageContent: (id, delta) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === id);
      if (idx < 0) return {};
      const updated = state.messages.slice();
      updated[idx] = { ...updated[idx], content: updated[idx].content + delta };
      return { messages: updated };
    }),

  setPersonInfo: (info) => {
    // Compat shim over the persons[] model.
    const state = get();
    if (info === null) {
      const current = state.currentPersonId;
      if (!current) return;
      const persons = state.persons.filter((p) => p.id !== current);
      set({
        persons,
        currentPersonId: persons[0]?.id ?? null,
        personInfo: persons[0] ?? null,
      });
      debounceSettingsSave(get);
      return;
    }
    const targetId = info.id ?? state.currentPersonId ?? crypto.randomUUID();
    const normalised: PersonInfo = {
      ...info,
      id: targetId,
      mode: info.mode ?? "praise",
    };
    const exists = state.persons.some((p) => p.id === targetId);
    const persons = exists
      ? state.persons.map((p) => (p.id === targetId ? normalised : p))
      : [normalised, ...state.persons];
    set({
      persons,
      currentPersonId: targetId,
      personInfo: normalised,
    });
    debounceSettingsSave(get);
  },

  addPerson: (person) => {
    const id = crypto.randomUUID();
    const next: PersonInfo = { ...person, id, mode: person.mode ?? "praise" };
    set((state) => ({
      persons: [next, ...state.persons],
      currentPersonId: id,
      personInfo: next,
    }));
    debounceSettingsSave(get);
    return id;
  },

  updatePerson: (id, patch) => {
    set((state) => {
      const persons = state.persons.map((p) => (p.id === id ? { ...p, ...patch, id } : p));
      const personInfo =
        state.currentPersonId === id
          ? (persons.find((p) => p.id === id) ?? null)
          : state.personInfo;
      return { persons, personInfo };
    });
    debounceSettingsSave(get);
  },

  removePerson: (id) => {
    set((state) => {
      const persons = state.persons.filter((p) => p.id !== id);
      const currentPersonId =
        state.currentPersonId === id ? (persons[0]?.id ?? null) : state.currentPersonId;
      const personInfo = findCurrentPerson(persons, currentPersonId);
      return { persons, currentPersonId, personInfo };
    });
    debounceSettingsSave(get);
  },

  setCurrentPerson: (id) => {
    set((state) => {
      const personInfo = findCurrentPerson(state.persons, id);
      return { currentPersonId: id, personInfo };
    });
    debounceSettingsSave(get);
  },

  setPersonMode: (id, mode) => {
    get().updatePerson(id, { mode });
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

  setStartMode: (mode) => set({ startMode: mode }),

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
      persons: [],
      currentPersonId: null,
      personInfo: null,
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

  // First pass: apply localStorage cache immediately for instant paint.
  const cached = loadSettingsFromCache();
  const cachedChats = loadChatsFromCache();
  if (cached || cachedChats.length > 0) {
    const cachedMigrated = migratePersons({
      personInfo: cached?.personInfo,
      persons: cached?.persons,
      currentPersonId: cached?.currentPersonId,
    });
    useAppStore.setState({
      persons: cachedMigrated.persons,
      currentPersonId: cachedMigrated.currentPersonId,
      personInfo: findCurrentPerson(cachedMigrated.persons, cachedMigrated.currentPersonId),
      praiseBarVisible: cached?.praiseBarVisible ?? DEFAULTS.praiseBarVisible,
      praiseMode: cached?.praiseMode ?? DEFAULTS.praiseMode,
      manualPraiseVolume: cached?.manualPraiseVolume ?? DEFAULTS.manualPraiseVolume,
      siteName: cached?.siteName ?? DEFAULTS.siteName,
      siteSubtitle: cached?.siteSubtitle ?? DEFAULTS.siteSubtitle,
      chats: cached?.chats?.length ? cached.chats : cachedChats,
      autoSpeak: cached?.autoSpeak ?? DEFAULTS.autoSpeak,
      ttsVoiceUri: cached?.ttsVoiceUri ?? DEFAULTS.ttsVoiceUri,
      darkMode: cached?.darkMode ?? DEFAULTS.darkMode,
      showSubjectPanel: cached?.showSubjectPanel ?? DEFAULTS.showSubjectPanel,
    });
    if (cached?.darkMode && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }

  // Second pass: reconcile with API (source of truth).
  const settings = await loadSettingsFromAPI();
  saveSettingsToCache(settings);
  saveChatsToCache(settings.chats);

  useAppStore.setState({
    persons: settings.persons,
    currentPersonId: settings.currentPersonId,
    personInfo: findCurrentPerson(settings.persons, settings.currentPersonId),
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
