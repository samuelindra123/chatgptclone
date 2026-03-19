"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageBubble, MessageBubbleProps } from "./MessageBubble";
import { Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string | React.ReactNode;
}

interface ChatBoxProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  className?: string;
}

export function ChatBox({ messages, isTyping, onSendMessage, className = "" }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      onSendMessage(input.trim());
      setInput("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-[600px] md:h-[700px] max-h-[80vh] w-full rounded-sm border border-gold/15 bg-[#0B0F19]/60 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.4)] overflow-hidden relative ${className}`}>
      
      {/* Decorative top border glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-neutral-500 font-serif text-lg md:text-xl italic font-light tracking-wide text-center">
              "Biarlah hikmat Kristus diam dengan segala kekayaannya di antara kamu..."<br/>
              <span className="text-sm font-sans uppercase tracking-[0.2em] font-semibold mt-4 block text-gold/60">Kolose 3:16</span>
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))
        )}
        {isTyping && <MessageBubble role="ai" content="" isTyping={true} />}
        <div ref={endOfMessagesRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gold/10 bg-[#0B0F19]/90 p-4 relative z-10">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-3 max-w-5xl mx-auto">
          <div className="relative flex-1 bg-white/5 border border-white/10 rounded-sm focus-within:border-gold/50 focus-within:bg-white/10 transition-all duration-300">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan tentang Alkitab, doktrin, atau apologetika..."
              className="w-full bg-transparent text-white placeholder-neutral-500 font-sans p-4 pr-12 resize-none outline-none min-h-[56px] max-h-[200px] overflow-y-auto"
              rows={1}
            />
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 flex items-center justify-center w-14 h-[56px] rounded-sm bg-gradient-to-b from-gold to-gold-dark text-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-300"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
            <span className="w-1 h-1 rounded-full bg-gold inline-block"></span>
            Academic Theology Level
            <span className="w-1 h-1 rounded-full bg-gold inline-block"></span>
          </p>
        </div>
      </div>
    </div>
  );
}
