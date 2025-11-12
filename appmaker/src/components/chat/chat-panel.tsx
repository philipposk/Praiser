"use client";

import { Sparkles } from "lucide-react";

import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";
import { ChatComposer } from "./chat-composer";

export const ChatPanel = () => {
  const messages = useAppStore((state) => state.messages);
  const isProcessing = useAppStore((state) => state.isProcessing);

  return (
    <section className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-5 py-4 shadow-lg shadow-black/40 backdrop-blur">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Vibe session</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Tell AppMaker what you want</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80">
          <Sparkles className={cn("h-4 w-4", isProcessing ? "animate-pulse text-accent" : "text-accent")} />
          {isProcessing ? "Groq synthesizing" : "Groq ready"}
        </div>
      </header>
        <div className="flex-1 overflow-hidden rounded-3xl border border-white/5 bg-black/40 p-6 shadow-inner shadow-black/40">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                source={message.source}
              />
            ))
          )}
        </div>
      </div>
      <ChatComposer />
    </section>
  );
};

type MessageBubbleProps = {
  role: "user" | "assistant" | "system";
  content: string;
  source?: "text" | "voice" | "system";
};

const MessageBubble = ({ role, content, source }: MessageBubbleProps) => {
  const isUser = role === "user";
  return (
    <div
      className={cn("flex w-full", {
        "justify-end": isUser,
        "justify-start": !isUser,
      })}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-3xl border px-5 py-3 text-sm leading-6 shadow-lg",
          isUser
            ? "border-accent/30 bg-accent/20 text-white"
            : "border-white/5 bg-white/10 text-white/90",
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {source === "voice" && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
            <MicWave />
            Voice note
          </span>
        )}
      </div>
    </div>
  );
};

const MicWave = () => (
  <svg viewBox="0 0 36 12" className="h-3 w-6 fill-accent">
    <rect x="0" y="3" width="4" height="6" rx="1.5" />
    <rect x="6" y="1" width="4" height="10" rx="1.5" />
    <rect x="12" y="0" width="4" height="12" rx="1.5" />
    <rect x="18" y="1" width="4" height="10" rx="1.5" />
    <rect x="24" y="3" width="4" height="6" rx="1.5" />
    <rect x="30" y="4" width="4" height="4" rx="1.5" />
  </svg>
);

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-white/70">
    <Sparkles className="h-8 w-8 text-accent" />
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/40">
        Start the session
      </p>
      <p className="mt-2 max-w-sm text-sm text-white/70">
        Share your idea in text or voice, then upload a mood board. AppMaker will fill the
        Instructions, Cursor Rules, and TODO templates and ask for any missing details.
      </p>
    </div>
  </div>
);
