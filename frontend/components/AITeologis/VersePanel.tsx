import React from "react";
import { BookMarked } from "lucide-react";

export interface Verse {
  reference: string;
  text: string;
  highlightWords?: string[];
}

interface VersePanelProps {
  verses: Verse[];
  className?: string;
}

export function VersePanel({ verses, className = "" }: VersePanelProps) {
  if (!verses || verses.length === 0) return null;

  return (
    <div className={`w-full max-w-[320px] shrink-0 transition-opacity duration-500 ${className}`}>
      <div className="sticky top-6 border border-gold/20 bg-gradient-to-b from-[#0B0F19]/90 to-[#121622]/90 backdrop-blur-xl p-6 rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:border-[0.5px] before:border-gold/10 before:rounded-sm before:pointer-events-none">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gold/10">
          <BookMarked className="w-5 h-5 text-gold" />
          <h3 className="font-serif text-white text-base font-semibold tracking-widest uppercase">Referensi</h3>
        </div>
        
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {verses.map((verse, idx) => {
            let highlightedText = verse.text;
            if (verse.highlightWords) {
              verse.highlightWords.forEach(word => {
                const regex = new RegExp(`(${word})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<span class="text-gold-light font-medium bg-gold/10 px-1 rounded-sm">$1</span>');
              });
            }
            
            return (
              <div key={idx} className="animate-fade-in group" style={{ animationDelay: `${idx * 0.1}s` }}>
                <p className="font-sans font-semibold text-gold-light text-xs tracking-wider uppercase mb-2 group-hover:text-gold transition-colors">
                  {verse.reference}
                </p>
                <div className="relative pl-3 border-l text-left border-gold/30">
                  <p 
                    className="font-serif text-sm text-neutral-300 leading-relaxed italic"
                    dangerouslySetInnerHTML={{ __html: `"${highlightedText}"` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
