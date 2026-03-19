"use client";

import React from "react";
import { BookOpen, Shield, ScrollText, Heart } from "lucide-react";
import { clsx } from "clsx";

export type TheologyMode = "eksposisi" | "apologetika" | "doktrin" | "konseling";

interface ModeSelectorProps {
  currentMode: TheologyMode;
  onModeChange: (mode: TheologyMode) => void;
}

const MODES: { id: TheologyMode; label: string; icon: React.ElementType }[] = [
  { id: "eksposisi", label: "Eksposisi Alkitab", icon: BookOpen },
  { id: "apologetika", label: "Apologetika", icon: Shield },
  { id: "doktrin", label: "Doktrin", icon: ScrollText },
  { id: "konseling", label: "Konseling", icon: Heart },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      {MODES.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={clsx(
              "flex items-center gap-2 px-5 py-2.5 rounded-sm border transition-all duration-300 backdrop-blur-md font-sans text-sm tracking-wide",
              isActive 
                ? "border-gold text-gold-light bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] font-medium" 
                : "border-white/10 text-neutral-400 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white font-light"
            )}
          >
            <Icon className={clsx("w-4 h-4", isActive ? "animate-pulse" : "opacity-70")} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
