import React from "react";
import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Subtle Glowing Cross / Light Rays Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-30">
        <div className="absolute w-[1px] h-[80vh] bg-gradient-to-b from-transparent via-gold/50 to-transparent animate-glow-pulse" />
        <div className="absolute h-[1px] w-[60vw] max-w-[500px] top-[40%] bg-gradient-to-r from-transparent via-gold/50 to-transparent animate-glow-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-[80vw] h-[80vh] bg-gold/5 rounded-full blur-3xl mix-blend-screen" />
      </div>

      <div className="relative z-10 text-center max-w-4xl px-4 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-gold/20 bg-gold/5 text-gold-light text-sm font-medium mb-8 backdrop-blur-md">
          <Sparkles className="w-4 h-4" />
          <span className="font-sans uppercase tracking-widest text-xs font-semibold">AI Teologis Premium</span>
        </div>
        
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6 drop-shadow-2xl leading-tight">
          Deep Biblical <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark italic font-light drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">Intelligence</span>
        </h1>
        
        <p className="font-sans text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
          Analisis Firman Tuhan dengan presisi akademik dan kedalaman rohani. Dibangun dengan basis apologetika dan historis.
        </p>
        
        <button className="px-10 py-4 bg-gradient-to-b from-gold to-gold-dark text-[#0B0F19] font-bold rounded-sm border border-gold-light hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] uppercase tracking-wider text-sm flex items-center justify-center gap-3 mx-auto">
          Mulai Konsultasi
          <span className="text-xl font-normal">→</span>
        </button>
      </div>
    </section>
  );
}
