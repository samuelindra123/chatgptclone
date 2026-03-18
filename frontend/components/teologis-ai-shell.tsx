"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, ChevronLeft, ChevronRight, Cross, History, Info, LibraryBig, MoreVertical, Pencil, ScrollText, Sparkles, Trash2, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LoginButton } from "@/components/login-button";
import { MessageContent } from "@/components/message-content";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import type { TheologySessionSummary } from "@/lib/api";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { useTheologyUiStore } from "@/lib/store/theology-ui";
import { cn } from "@/lib/utils";

function TheologyComposer() {
  const composerText = useTheologyUiStore((state) => state.composerText);
  const isSending = useTheologyUiStore((state) => state.isSending);
  const authStatus = useTheologyUiStore((state) => state.authStatus);
  const errorMessage = useTheologyUiStore((state) => state.errorMessage);
  const setComposerText = useTheologyUiStore((state) => state.setComposerText);
  const sendMessage = useTheologyUiStore((state) => state.sendMessage);
  const stopMessageGeneration = useTheologyUiStore((state) => state.stopMessageGeneration);

  const canSend = composerText.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-[var(--composer-width)] space-y-2">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#1e1e1e] px-4 py-3 shadow-lg focus-within:border-[#d7b06e]/40 transition-all duration-200">
        <div className="relative flex items-end gap-2">
          <textarea
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            placeholder={
              authStatus === "authenticated"
                ? "Tanyakan teologi (mis. Trinitas, kedaulatan Allah, sejarah gereja)..."
                : "Login untuk mulai diskusi Teologis AI"
            }
            rows={1}
            className="max-h-52 min-h-[1.5rem] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-[15px] leading-6 text-[#f2e6cf] outline-none placeholder:text-white/40"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (isSending) {
                  stopMessageGeneration();
                  return;
                }
                void sendMessage();
              }
            }}
          />
          <button
            type="button"
            disabled={!isSending && !canSend}
            onClick={() => {
              if (isSending) {
                stopMessageGeneration();
                return;
              }
              void sendMessage();
            }}
            className={cn(
              "mb-0.5 flex size-8 items-center justify-center rounded-full transition-all duration-150",
              isSending
                ? "bg-[#d7b06e] text-black"
                : canSend
                  ? "bg-[#d7b06e] text-black hover:bg-[#eac484]"
                  : "bg-white/5 text-white/30"
            )}
          >
            {isSending ? (
               <span className="block size-2.5 rounded-[1px] bg-current" />
            ) : (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-[15px]">
                <path d="M10 14.4V5.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="m6.7 9.15 3.3-3.35 3.3 3.35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {errorMessage ? <p className="text-[12px] text-[#ffb8b8] px-2">{errorMessage}</p> : null}
    </div>
  );
}

function TheologyEmptyState() {
  const setComposerText = useTheologyUiStore((state) => state.setComposerText);
  const sendMessage = useTheologyUiStore((state) => state.sendMessage);

  const suggestions = [
    {
      title: "Doktrin Allah",
      prompt: "Jelaskan konsep Trinitas secara sistematis dan rujukan Alkitabnya.",
      icon: <Sparkles className="size-4 text-[#d7b06e]" />
    },
    {
      title: "Sejarah Gereja",
      prompt: "Apa dampak Konsili Nicea terhadap kristologi gereja saat ini?",
      icon: <History className="size-4 text-[#d7b06e]" />
    },
    {
      title: "Soteriologi",
      prompt: "Jelaskan hubungan antara iman dan perbuatan dalam perspektif teologi Reformed.",
      icon: <BookOpenText className="size-4 text-[#d7b06e]" />
    }
  ];

  const handleSuggestion = (prompt: string) => {
    setComposerText(prompt);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#d7b06e]/10 text-[#d7b06e] border border-[#d7b06e]/20 shadow-[0_0_30px_rgba(215,176,110,0.15)]">
          <Cross className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#f7e7cb] sm:text-4xl">
          Teologis AI
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#d7c4a2]/70 max-w-md mx-auto">
          Partner dialog teologi Kristen dengan standar akademik: sistematis, biblika, dan argumentatif.
        </p>
      </motion.div>

      <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleSuggestion(s.prompt)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-[#d7b06e]/30 hover:bg-white/[0.06]"
          >
            <div className="rounded-lg bg-white/5 p-2">{s.icon}</div>
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-[#f2dfbc]">{s.title}</p>
              <p className="line-clamp-2 text-[11.5px] leading-relaxed text-white/40">{s.prompt}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] text-[#d7b06e]/80">
          <LibraryBig className="size-3" />
          Berbasis Rujukan Alkitab
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] text-[#d7b06e]/80">
          <ScrollText className="size-3" />
          Analisis Akademik
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] text-[#d7b06e]/80">
          <Trophy className="size-3" />
          Struktur Sistematis
        </div>
      </div>
    </div>
  );
}

function TheologyMessages() {
  const messages = useTheologyUiStore((state) => state.messages);

  if (messages.length === 0) {
    return <TheologyEmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto pt-4 scrollbar-thin">
      <div className="mx-auto max-w-[var(--composer-width)] space-y-6 pb-8 px-1">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "USER" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                message.role === "USER"
                  ? "max-w-[85%] rounded-[1.4rem] bg-[#2f2f2f] px-4 py-2.5 text-[#f4e4c7]"
                  : "w-full max-w-full bg-transparent px-0.5 text-[#f4e4c7]"
              )}
            >
              {message.role === "USER" ? (
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed tracking-[-0.01em]">
                  {message.content}
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-6 rounded-full bg-[#d7b06e]/10 flex items-center justify-center border border-[#d7b06e]/20">
                      <Cross className="size-3 text-[#d7b06e]" />
                    </div>
                    <span className="text-[12px] font-semibold text-[#d7b06e] tracking-wide uppercase">Teologis AI</span>
                  </div>
                  <MessageContent content={message.content} isStreaming={message.isStreaming} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionItem({ 
  session, 
  isActive, 
  onActivate, 
  onRename, 
  onDeleteRequest,
  menuOpen,
  onMenuToggle
}: { 
  session: TheologySessionSummary; 
  isActive: boolean; 
  onActivate: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDeleteRequest: (session: TheologySessionSummary) => void;
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title || "");

  const handleRename = async () => {
    if (editTitle.trim() && editTitle !== session.title) {
      await onRename(session.id, editTitle);
    }
    setIsEditing(false);
    onMenuToggle(false);
  };

  return (
    <div className="relative group mb-1">
      {isEditing ? (
        <div className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 border border-[#d7b06e]/30">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditTitle(session.title || "");
              }
            }}
            onBlur={handleRename}
            className="w-full bg-transparent text-[13px] text-white outline-none"
          />
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={onActivate}
            className={cn(
              "w-full rounded-xl px-3 py-2.5 text-left transition-all pr-12",
              isActive
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <p className="line-clamp-1 text-[13.5px] font-medium leading-tight">{session.title || "Percakapan baru"}</p>
            <p className="mt-1 line-clamp-1 text-[11px] opacity-40 leading-none">{session.preview || "Belum ada ringkasan"}</p>
          </button>

          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
            {menuOpen ? (
              <div className="relative">
                <div 
                  className="fixed inset-0 z-[100] cursor-default bg-black/20 backdrop-blur-[1px]" 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMenuToggle(false);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-0 z-[110] w-36 overflow-hidden rounded-xl border border-white/10 bg-[#222222] shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditing(true);
                      onMenuToggle(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Pencil className="size-3.5 text-[#d7b06e]" />
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteRequest(session);
                      onMenuToggle(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </button>
                </motion.div>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMenuToggle(true);
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-white/20 transition-all hover:bg-white/10 hover:text-white lg:opacity-0 lg:group-hover:opacity-100",
                  isActive && "lg:opacity-100"
                )}
                aria-label="Buka menu sesi"
              >
                <MoreVertical className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionList({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const sessions = useTheologyUiStore((state) => state.sessions);
  const selectedSessionId = useTheologyUiStore((state) => state.selectedSessionId);
  const activateSession = useTheologyUiStore((state) => state.activateSession);
  const renameSession = useTheologyUiStore((state) => state.renameSession);
  const deleteSession = useTheologyUiStore((state) => state.deleteSession);
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<TheologySessionSummary | null>(null);

  const handleDelete = async () => {
    if (sessionToDelete) {
      await deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: isOpen ? 0 : -300 }}
      className={cn(
        "fixed inset-y-0 left-0 z-[60] w-[18rem] bg-[#171717] border-r border-white/10 shadow-2xl lg:absolute lg:z-10",
        !isOpen && "pointer-events-none opacity-0 lg:hidden"
      )}
    >
      <div className="flex h-full flex-col p-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <History className="size-4" />
            Riwayat Teologi
          </h2>
          <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white">
            <ChevronLeft className="size-5" />
          </button>
        </div>
        <button
          onClick={() => {
            void activateSession(null);
            if (window.innerWidth < 1024) onClose();
          }}
          className={cn(
            "mb-4 w-full rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all",
            selectedSessionId === null
              ? "border-[#d7b06e]/40 bg-[#d7b06e]/10 text-[#d7b06e]"
              : "border-white/5 bg-white/5 text-white/60 hover:bg-white/10"
          )}
        >
          + Sesi Teologi Baru
        </button>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === selectedSessionId}
              onActivate={() => {
                void activateSession(session.id);
                if (window.innerWidth < 1024) onClose();
              }}
              onRename={renameSession}
              onDeleteRequest={(s) => setSessionToDelete(s)}
              menuOpen={activeMenuId === session.id}
              onMenuToggle={(open) => setActiveMenuId(open ? session.id : null)}
            />
          ))}
        </div>
      </div>

      {/* Single Modal Instance at the List Level */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setSessionToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-[#1a1a1a] p-8 shadow-2xl"
            >
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <Trash2 className="size-6" />
              </div>
              <h3 className="text-center text-xl font-bold text-white">Hapus Diskusi?</h3>
              <p className="mt-3 text-center text-sm leading-relaxed text-white/50">
                Apakah Anda yakin ingin menghapus "{sessionToDelete.title}"? Seluruh riwayat dalam sesi ini akan hilang selamanya.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  className="w-full rounded-2xl bg-red-500 py-3 text-sm font-bold text-white transition-all hover:bg-red-600 active:scale-95 shadow-lg shadow-red-500/20"
                >
                  Ya, Hapus Sesi
                </button>
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="w-full rounded-2xl py-3 text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white transition-all"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TeologisAiShell() {
  const initializeGeneralUi = useChatUiStore((state) => state.initializeApp);
  const initialize = useTheologyUiStore((state) => state.initialize);
  const initializing = useTheologyUiStore((state) => state.initializing);
  const deepAcademicMode = useTheologyUiStore((state) => state.deepAcademicMode);
  const toggleDeepAcademicMode = useTheologyUiStore((state) => state.toggleDeepAcademicMode);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  useEffect(() => {
    void initializeGeneralUi(null);
    void initialize();
  }, [initialize, initializeGeneralUi]);

  return (
    <div className="bg-app flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {/* Sub Header / Control Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0d0d0d]/50 px-4 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSessionsOpen(!sessionsOpen)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors",
                  sessionsOpen ? "bg-[#d7b06e]/20 text-[#d7b06e]" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <History className="size-4" />
                <span className="hidden sm:inline">Riwayat</span>
              </button>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 px-2 text-[12px] text-[#d7b06e]/80">
                <Sparkles className="size-3.5" />
                <span className="font-semibold tracking-wide">MODE TEOLOGIS</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition-hover hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={deepAcademicMode}
                  onChange={toggleDeepAcademicMode}
                  className="size-3 accent-[#d7b06e]"
                />
                <span>Akademik Mendalam</span>
              </label>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            <SessionList isOpen={sessionsOpen} onClose={() => setSessionsOpen(false)} />
            
            <div className={cn(
              "flex flex-1 flex-col overflow-hidden transition-all duration-300",
              sessionsOpen ? "lg:ml-[18rem]" : "ml-0"
            )}>
              {initializing ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-2 border-[#d7b06e]/20 border-t-[#d7b06e]" />
                    <p className="text-xs text-[#d7b06e]/60">Menyiapkan Ruang Teologi...</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <TheologyMessages />
                  <div className="pb-4 pt-2">
                    <TheologyComposer />
                    <p className="mt-3 text-center text-[11px] text-white/30">
                      Teologis AI dapat memberikan jawaban kompleks. Selalu verifikasi dengan Alkitab dan sumber teologi primer.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
