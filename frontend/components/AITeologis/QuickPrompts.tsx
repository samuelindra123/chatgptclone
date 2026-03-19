import React from "react";

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const PROMPTS = [
  "Apa makna gramatikal dan historis dari Yohanes 3:16?",
  "Apakah keselamatan bisa hilang menurut pandangan Calvinisme vs Arminianisme?",
  "Jelaskan konsep Tritunggal secara logis untuk menjawab kritik.",
  "Mengapa Yesus disebut sebagai Tuhan dalam Perjanjian Baru?"
];

export function QuickPrompts({ onSelectPrompt }: QuickPromptsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
      {PROMPTS.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelectPrompt(prompt)}
          className="group text-left p-5 flex flex-col justify-between bg-white/5 border border-white/10 rounded-sm hover:border-gold/50 hover:bg-gold/5 transition-all duration-300 overflow-hidden relative min-h-[100px]"
        >
          {/* Subtle hover background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <p className="font-sans text-sm text-neutral-300 group-hover:text-gold-light transition-colors relative z-10 leading-relaxed font-light">
            "{prompt}"
          </p>
          
          <div className="mt-4 flex items-center text-xs font-medium uppercase tracking-widest text-gold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0 relative z-10">
            Tanyakan
            <span className="ml-2">→</span>
          </div>
        </button>
      ))}
    </div>
  );
}
