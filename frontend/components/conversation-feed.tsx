"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type TouchEvent, type WheelEvent } from "react";
import { MessageContent } from "@/components/message-content";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

const BOTTOM_THRESHOLD = 96;
const SCROLL_INTENT_THRESHOLD = 6;

function UserAttachmentGrid({
  attachments
}: {
  attachments: NonNullable<ReturnType<typeof useChatUiStore.getState>["messages"][number]["attachments"]>;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-2", attachments.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        >
          {attachment.mimeType.startsWith("image/") ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[18rem] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex min-h-[7rem] items-end bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-3">
              <p className="line-clamp-2 text-[12px] font-medium text-white/84">{attachment.name}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ConversationFeed() {
  const messages = useChatUiStore((state) => state.messages);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);

  const hasStreamingMessage = useMemo(
    () => messages.some((message) => message.role === "ASSISTANT" && message.isStreaming),
    [messages]
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (!autoFollow) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: hasStreamingMessage ? "auto" : "smooth"
    });
  }, [autoFollow, hasStreamingMessage, messages]);

  function isNearBottom(element: HTMLDivElement) {
    return element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_THRESHOLD;
  }

  function handleScroll() {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const nearBottom = isNearBottom(container);
    const scrollingUp = container.scrollTop < lastScrollTopRef.current - SCROLL_INTENT_THRESHOLD;

    if (scrollingUp) {
      setAutoFollow(false);
    } else if (nearBottom) {
      setAutoFollow(true);
    }

    lastScrollTopRef.current = container.scrollTop;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (event.deltaY < 0 && !isNearBottom(container)) {
      setAutoFollow(false);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const container = containerRef.current;
    const touchStartY = touchStartYRef.current;
    const currentY = event.touches[0]?.clientY;

    if (!container || touchStartY === null || currentY === undefined) {
      return;
    }

    if (currentY > touchStartY && !isNearBottom(container)) {
      setAutoFollow(false);
    }
  }

  function scrollToBottom() {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
    setAutoFollow(true);
  }

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="mx-auto flex w-full max-w-[var(--composer-width)] flex-1 flex-col overflow-y-auto px-1 pb-2 scrollbar-thin"
      >
        <div className="flex-1 min-h-6" />
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "USER" ? "justify-end py-1.5" : "justify-start py-3")}
          >
            <div
              className={cn(
                message.role === "USER"
                  ? "max-w-[85%] rounded-[1.4rem] bg-[#2f2f2f] px-4 py-2.5 text-[var(--text-primary)]"
                  : "w-full max-w-full bg-transparent px-0.5 text-[var(--text-primary)]"
              )}
            >
              {message.role === "USER" ? (
                <div className="space-y-2.5">
                  {message.attachments && message.attachments.length > 0 ? (
                    <UserAttachmentGrid attachments={message.attachments} />
                  ) : null}
                  {message.content ? (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed tracking-[-0.01em]">
                      {message.content}
                    </p>
                  ) : null}
                </div>
              ) : (
                <MessageContent
                  content={message.content}
                  isStreaming={message.isStreaming}
                  isImageGeneration={message.isImageGeneration}
                />
              )}
              {message.attachmentCount > 0 && (!message.attachments || message.attachments.length === 0) ? (
                <p className="mt-1.5 text-[12px] text-white/52">
                  {message.attachmentCount} lampiran
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {!autoFollow ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/[0.12] bg-[#2f2f2f] text-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.32)] transition-all duration-150 hover:bg-[#3a3a3a] hover:text-white"
            aria-label="Kembali ke pesan terbaru"
          >
            <ArrowDown className="size-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
