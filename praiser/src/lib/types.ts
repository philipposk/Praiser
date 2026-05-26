export type Role = "user" | "assistant" | "system";

export type MessageImage = {
  url: string;
  type: string;
  name?: string;
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  source?: "text" | "voice" | "system";
  images?: MessageImage[];
};

export type ChatMode =
  | "praise"
  | "roast"
  | "hype"
  | "birthday"
  | "anniversary"
  | "affirmation"
  | "tribute";

export const ALL_CHAT_MODES: ChatMode[] = [
  "praise",
  "roast",
  "hype",
  "birthday",
  "anniversary",
  "affirmation",
  "tribute",
];

export type PersonInfo = {
  /** Stable id; generated on creation. */
  id?: string;
  name: string;
  /** Conversational tone for this person. Defaults to "praise". */
  mode?: ChatMode;
  /** ElevenLabs voice_id when the user has cloned a voice for this person. */
  ttsVoiceId?: string;
  images: MessageImage[];
  videos: Array<{
    url: string;
    type: string;
    name?: string;
  }>;
  urls: string[];
  extraInfo: string;
};

export type Chat = {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};
