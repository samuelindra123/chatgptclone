"use client";

import React, { useState } from "react";
import { HeroSection } from "@/components/AITeologis/HeroSection";
import { ModeSelector, TheologyMode } from "@/components/AITeologis/ModeSelector";
import { QuickPrompts } from "@/components/AITeologis/QuickPrompts";
import { ChatBox } from "@/components/AITeologis/ChatBox";
import { VersePanel, Verse } from "@/components/AITeologis/VersePanel";

export default function TeologisAiPage() {
  const [mode, setMode] = useState<TheologyMode>("eksposisi");
  const [messages, setMessages] = useState<{id: string; role: "user"|"ai"; content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [verses, setVerses] = useState<Verse[]>([]);

  const handleModeChange = (newMode: TheologyMode) => {
    setMode(newMode);
    setMessages([]); // Clears history on mode change as decided
    setVerses([]);
  };

  const handleSendMessage = (content: string) => {
    const newUserMsg = { id: Date.now().toString(), role: "user" as const, content };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    // Mock response
    setTimeout(() => {
      setIsTyping(false);
      const aiResponse = { 
        id: (Date.now() + 1).toString(), 
        role: "ai" as const, 
        content: `Ini adalah respons simulasi analitik dalam mode ${mode} untuk pertanyaan: "${content}". Dalam lingkungan produksi, ini akan dijawab menggunakan Retrieval-Augmented Generation (RAG) pada literatur teologi dan tafsiran historis.` 
      };
      setMessages(prev => [...prev, aiResponse]);
      
      // Mock verses display
      setVerses([
        { reference: "Yohanes 1:1", text: "Pada mulanya adalah Firman; Firman itu bersama-sama dengan Allah dan Firman itu adalah Allah.", highlightWords: ["Firman"] },
        { reference: "2 Timotius 3:16", text: "Segala tulisan yang diilhamkan Allah memang bermanfaat untuk mengajar, untuk menyatakan kesalahan, untuk memperbaiki kelakuan dan untuk mendidik orang dalam kebenaran.", highlightWords: ["diilhamkan Allah"] },
        { reference: "Roma 11:33", text: "O, alangkah dalamnya kekayaan, hikmat dan pengetahuan Allah! Sungguh tak terselidiki keputusan-keputusan-Nya dan sungguh tak terselami jalan-jalan-Nya!", highlightWords: ["hikmat"] }
      ]);
    }, 2000);
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-neutral-200 font-sans selection:bg-gold/30 selection:text-gold-light">
      <HeroSection />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 -mt-8 relative z-20">
        <ModeSelector currentMode={mode} onModeChange={handleModeChange} />
        
        {messages.length === 0 && (
          <div className="mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <QuickPrompts onSelectPrompt={handleQuickPrompt} />
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mt-8 lg:mt-12">
          {/* Chat Interface Priority */}
          <div className="flex-1 w-full order-2 lg:order-1">
            <ChatBox 
              messages={messages} 
              isTyping={isTyping} 
              onSendMessage={handleSendMessage} 
              className="animate-slide-up"
            />
          </div>
          
          {/* Sticky Side Panel */}
          <div className="w-full lg:w-[320px] order-1 lg:order-2 mb-6 lg:mb-0">
            {verses.length > 0 && <VersePanel verses={verses} />}
            
            {/* Optional Sidebar info if empty */}
            {verses.length === 0 && (
              <div className="hidden lg:block sticky top-6 border border-white/5 bg-white/5 p-6 rounded-sm text-sm text-neutral-400 font-light leading-relaxed animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <p className="mb-4">
                  <strong className="text-gold font-medium uppercase tracking-widest text-[10px] block mb-2">Penalaran Berbasis Kitab</strong>
                  Mode <span className="text-gold-light capitalize">{mode}</span> mengutamakan akurasi literal, gramatikal, dan historis.
                </p>
                <p>
                  Setiap argumen yang diberikan akan merujuk langsung pada ayat Alkitab dan konsensus Bapa Gereja atau teolog klasik.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
