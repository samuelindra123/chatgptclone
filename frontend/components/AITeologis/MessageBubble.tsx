import React from "react";
import { clsx } from "clsx";
import { User, Sparkles } from "lucide-react";

export interface MessageBubbleProps {
  role: "user" | "ai";
  content: string | React.ReactNode;
  isTyping?: boolean;
}

export function MessageBubble({ role, content, isTyping }: MessageBubbleProps) {
  const isAi = role === "ai";
  
  return (
    <div className={clsx(
      "flex w-full animate-fade-in",
      isAi ? "justify-start" : "justify-end"
    )}>
      <div className={clsx(
        "flex max-w-[90%] md:max-w-[85%] gap-3 md:gap-4 p-4 md:p-6",
        isAi 
          ? "bg-gradient-to-br from-[#121622] to-[#0A0E17] border border-gold/20 rounded-tr-sm rounded-br-sm rounded-bl-sm shadow-[0_4px_20px_rgba(212,175,55,0.05)]"
          : "bg-[#1A2133]/60 border border-indigo-200/5 rounded-tl-sm rounded-tr-sm rounded-bl-sm shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
      )}>
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isAi ? (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-none border border-gold bg-gradient-to-br from-[#1E1A11] to-[#0B0F19] flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.2)]">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-gold-light" />
            </div>
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-neutral-800 flex items-center justify-center">
              <User className="w-4 h-4 md:w-5 md:h-5 text-neutral-400" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 md:mb-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.15em]">
            <span className={isAi ? "text-gold" : "text-neutral-500"}>
              {isAi ? "Magister AI" : "Anda"}
            </span>
          </div>
          
          <div className={clsx(
            "message-rich font-sans text-sm md:text-base leading-relaxed font-light",
            isAi ? "text-neutral-200" : "text-neutral-300"
          )}>
            {isTyping ? (
              <div className="flex items-center gap-1.5 mt-2 h-5">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            ) : (
              content
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
