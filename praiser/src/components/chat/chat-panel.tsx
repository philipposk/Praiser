"use client";

import { useEffect, useRef } from "react";

import { ChatComposer } from "./chat-composer";
import { EmptyState } from "./empty-state";
import { MessageBubble, Thinking } from "./message-bubble";
import { TopBar } from "./top-bar";
import { useChatController } from "@/hooks/use-chat-controller";
import { useAppStore } from "@/state/app-store";

type Props = {
  onImageClick: (url: string) => void;
};

export const ChatPanel = ({ onImageClick }: Props) => {
  const messages = useAppStore((s) => s.messages);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const { sendUserMessage } = useChatController();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 160;
    if (nearBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages.length, isProcessing]);

  const isEmpty = messages.length === 0;

  return (
    <main className="main">
      <TopBar />
      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-inner">
          {isEmpty ? (
            <EmptyState onPick={(text) => void sendUserMessage(text, "text")} />
          ) : (
            <div className="messages">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} onImageClick={onImageClick} />
              ))}
              {isProcessing && <Thinking />}
            </div>
          )}
        </div>
      </div>
      <ChatComposer />
    </main>
  );
};
