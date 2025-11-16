"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronUp, ChevronDown, Copy, Check, Share2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { LanguageToggle } from "@/components/language/language-toggle";
import { PraiseVolumeControl } from "@/components/praise/praise-volume-control";
import type { MessageImage, Message } from "@/lib/types";
import { ChatComposer } from "./chat-composer";

export const ChatPanel = () => {
  const messages = useAppStore((state) => state.messages);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const uiLanguage = useAppStore((state) => state.uiLanguage);
  const praiseBarVisible = useAppStore((state) => state.praiseBarVisible);
  const chatName = useAppStore((state) => state.chatName);
  const t = useTranslation(uiLanguage);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position to show/hide scroll indicators and auto-scroll to bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollTop(scrollTop > 50);
      setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 50);
    };

    checkScroll();
    container.addEventListener("scroll", checkScroll);
    // Also check when messages change
    const observer = new MutationObserver(() => {
      checkScroll();
      // Auto-scroll to bottom when new messages arrive (if near bottom)
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTo({ top: scrollHeight, behavior: "smooth" });
        }, 100);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      container.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [messages]);

  // Auto-scroll to bottom when processing starts
  useEffect(() => {
    if (isProcessing && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [isProcessing]);


  return (
    <section className="flex h-full w-full flex-col bg-[#1a1a1a]">
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 glass">
        <div className="flex-1" />
        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 status-dot" />
          <span className="text-sm text-white/70 font-medium tracking-wide uppercase text-[10px]">
            {chatName || "Praiser · Live"}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2">
          <LanguageToggle />
          {praiseBarVisible && <PraiseVolumeControl />}
        </div>
      </div>
      {/* Main Chat Area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Scroll indicators */}
        {showScrollTop && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-gradient-to-b from-black/60 to-transparent py-2 pointer-events-none">
            <ChevronUp className="h-4 w-4 text-white/60" />
          </div>
        )}
        {showScrollBottom && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent py-2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-white/60" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full flex-col">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="mb-32">
                <EmptyState t={t} />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 pb-8">
              <ChatComposer />
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollContainerRef} className="flex h-full flex-col overflow-y-auto py-8 pb-32 p-4 gap-3">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  messageIndex={index}
                  allMessages={messages}
                />
              ))}
              {isProcessing && <ThinkingIndicator />}
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <ChatComposer />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

type MessageBubbleProps = {
  message: Message;
  messageIndex: number;
  allMessages: Message[];
};

const MessageBubble = ({ message, messageIndex, allMessages }: MessageBubbleProps) => {
  const { role, content, source, images, id } = message;
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const siteName = useAppStore((state) => state.siteName);
  const uiLanguage = useAppStore((state) => state.uiLanguage);
  const logoLetter = siteName.trim() ? siteName.trim().charAt(0).toUpperCase() : "M";
  const t = useTranslation(uiLanguage);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (isSharing || !messageRef.current) return;
    
    setIsSharing(true);
    try {
      // Find the user's question that corresponds to this AI reply
      // Look backwards from this message to find the previous user message
      let userMessageIndex = -1;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (allMessages[i].role === "user") {
          userMessageIndex = i;
          break;
        }
      }

      // Collect all messages to include in screenshot (user question + all consecutive AI replies)
      const messagesToCapture: Message[] = [];
      if (userMessageIndex >= 0) {
        messagesToCapture.push(allMessages[userMessageIndex]);
      }
      
      // Add this AI message and any consecutive AI messages after it
      for (let i = messageIndex; i < allMessages.length; i++) {
        if (allMessages[i].role === "assistant") {
          messagesToCapture.push(allMessages[i]);
        } else {
          break;
        }
      }

      // Create a temporary container for screenshot
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "800px";
      tempContainer.style.backgroundColor = "#1a1a1a";
      tempContainer.style.padding = "24px";
      document.body.appendChild(tempContainer);

      // Render messages in temp container
      const imagePromises: Promise<void>[] = [];
      
      messagesToCapture.forEach((msg) => {
        const msgDiv = document.createElement("div");
        msgDiv.style.cssText = "margin-bottom: 1rem; display: flex; gap: 1rem;";
        
        let contentHtml = msg.content.replace(/\n/g, "<br>");
        
        // Add images if present
        if (msg.images && msg.images.length > 0) {
          const imagesHtml = msg.images.map((img) => 
            `<img src="${img.url}" alt="${img.name || 'Image'}" style="max-height: 192px; width: 100%; border-radius: 8px; object-fit: cover; margin-bottom: 12px; display: block;" />`
          ).join("");
          const imagesContainer = msg.images.length > 1 
            ? `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">${msg.images.map((img) => 
                `<img src="${img.url}" alt="${img.name || 'Image'}" style="max-height: 192px; width: 100%; border-radius: 8px; object-fit: cover;" />`
              ).join("")}</div>`
            : imagesHtml;
          contentHtml = imagesContainer + contentHtml;
        }
        
        if (msg.role === "user") {
          msgDiv.innerHTML = `
            <div style="flex: 1;"></div>
            <div style="flex: 1; border-radius: 1rem; background-color: rgba(106, 91, 255, 0.2); padding: 0.75rem 1rem; font-size: 0.875rem; line-height: 1.5rem; color: #ffffff;">
              ${contentHtml}
            </div>
          `;
        } else {
          msgDiv.innerHTML = `
            <div style="flex: 0 0 auto; height: 2rem; width: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 9999px; background-color: rgba(106, 91, 255, 0.2); font-size: 0.875rem; font-weight: 500; color: #ffffff;">
              ${logoLetter}
            </div>
            <div style="flex: 1; border-radius: 1rem; background-color: rgba(255, 255, 255, 0.05); padding: 0.75rem 1rem; font-size: 0.875rem; line-height: 1.5rem; color: rgba(255, 255, 255, 0.9);">
              ${contentHtml}
            </div>
          `;
        }
        
        tempContainer.appendChild(msgDiv);
        
        // Wait for images to load
        if (msg.images && msg.images.length > 0) {
          msg.images.forEach((img) => {
            const imgPromise = new Promise<void>((resolve) => {
              const imgElement = new Image();
              imgElement.crossOrigin = "anonymous";
              imgElement.onload = () => resolve();
              imgElement.onerror = () => resolve(); // Continue even if image fails
              imgElement.src = img.url;
            });
            imagePromises.push(imgPromise);
          });
        }
      });

      // Wait for all images to load
      await Promise.all(imagePromises);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Capture screenshot
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: "#1a1a1a",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        onclone: (clonedDoc) => {
          // Remove any stylesheets that might contain oklab or other unsupported CSS
          const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          stylesheets.forEach((sheet) => {
            try {
              sheet.remove();
            } catch (e) {
              // Ignore errors
            }
          });
        },
      });

      // Clean up
      document.body.removeChild(tempContainer);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }

        const currentUrl = window.location.href;
        // Randomly select a share message from the array, fallback to single shareMessage
        const shareMessages = (t as any).shareMessages || [t.shareMessage];
        const randomShareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)];
        const shareText = `${randomShareMessage} ${currentUrl}`;
        const shareData: ShareData = {
          title: siteName || "AI Chat",
          text: shareText,
          files: [new File([blob], "chat-screenshot.png", { type: "image/png" })],
        };

        try {
          // Try Web Share API with file support
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else if (navigator.share) {
            // Fallback: share without file (some browsers don't support file sharing)
            await navigator.share({
              title: shareData.title,
              text: shareText,
              url: currentUrl,
            });
          } else {
            // Fallback: download image and copy text
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "chat-screenshot.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Copy text to clipboard
            try {
              await navigator.clipboard.writeText(shareText);
              alert("Screenshot downloaded! Share message copied to clipboard.");
            } catch {
              alert("Screenshot downloaded! Share this: " + shareText);
            }
          }
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Share failed:", error);
            // Fallback: download image
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "chat-screenshot.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        } finally {
          setIsSharing(false);
        }
      }, "image/png");
    } catch (error) {
      console.error("Screenshot failed:", error);
      setIsSharing(false);
    }
  };
  
  return (
    <div ref={messageRef} className="mx-auto flex w-full max-w-4xl gap-4 px-4 group message-fade-in">
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-white status-dot">
          {logoLetter}
        </div>
      )}
      {isUser && <div className="flex-1" />}
      <div
        className={cn(
          "relative flex-1 rounded-2xl px-4 py-3 text-sm leading-6 transition-all duration-300",
          isUser
            ? "chat-bubble-user text-white"
            : "chat-bubble-assistant text-white/90",
        )}
      >
        {images && images.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img.url}
                alt={img.name || `Image ${idx + 1}`}
                className="max-h-48 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        {content && <p className="whitespace-pre-wrap">{content}</p>}
        {source === "voice" && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
            <MicWave />
            Voice note
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={handleCopy}
            className={cn(
              "rounded p-1.5 transition",
              isUser
                ? "bg-accent/30 text-white hover:bg-accent/40"
                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            )}
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          {isAssistant && (
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="rounded p-1.5 transition bg-white/10 text-white/60 hover:bg-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Share message"
            >
              {isSharing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
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

const ThinkingIndicator = () => {
  const siteName = useAppStore((state) => state.siteName);
  const logoLetter = siteName.trim() ? siteName.trim().charAt(0).toUpperCase() : "M";
  // Extract the name from siteName (e.g., "Mike's Chatbot" -> "Mike")
  const displayName = siteName.trim() 
    ? siteName.trim().split("'")[0].split(" ")[0] || "Mike"
    : "Mike";
  
  return (
    <div className="mx-auto flex w-full max-w-4xl gap-4 px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-white">
        {logoLetter}
      </div>
      <div className="flex-1 rounded-2xl bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-white/60">
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
          </div>
          <span className="text-xs">{displayName} is thinking...</span>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ t }: { t: ReturnType<typeof useTranslation> }) => {
  const siteName = useAppStore((state) => state.siteName);
  const siteSubtitle = useAppStore((state) => state.siteSubtitle);
  const uiLanguage = useAppStore((state) => state.uiLanguage);
  const displayName = siteName.trim() || "Mike's Chatbot";
  
  // Use random subtitle from array when siteSubtitle is empty, otherwise use custom subtitle
  const displaySubtitle = useMemo(() => {
    const customSubtitle = siteSubtitle.trim();
    if (customSubtitle) {
      return customSubtitle;
    }
    // When empty, randomly select from the subtitles array
    const subtitles = t.subtitles || [t.subtitle];
    return subtitles[Math.floor(Math.random() * subtitles.length)];
  }, [siteSubtitle, uiLanguage, t.subtitles, t.subtitle]);
  
  return (
    <div className="flex flex-col items-center justify-center text-center px-4">
      <h1 className="mb-2 text-4xl font-bold text-white">{displayName}</h1>
      <p className="text-base text-white/60">{displaySubtitle}</p>
    </div>
  );
};