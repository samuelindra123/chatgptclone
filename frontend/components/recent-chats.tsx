"use client";

import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

type MenuState = {
  chatId: string;
  top: number;
  left: number;
};

export function RecentChats() {
  const recentChats = useChatUiStore((state) => state.recentChats);
  const authStatus = useChatUiStore((state) => state.authStatus);
  const desktopSidebarCollapsed = useChatUiStore((state) => state.desktopSidebarCollapsed);
  const activateRecentChat = useChatUiStore((state) => state.activateRecentChat);
  const renameRecentChat = useChatUiStore((state) => state.renameRecentChat);
  const deleteRecentChat = useChatUiStore((state) => state.deleteRecentChat);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function handleRenameSave(chatId: string) {
    const success = await renameRecentChat(chatId, draftTitle);

    if (success) {
      setEditingChatId(null);
      setDraftTitle("");
      setMenuState(null);
    }
  }

  async function handleDelete(chatId: string) {
    const success = await deleteRecentChat(chatId);

    if (success) {
      setMenuState(null);
      setConfirmDeleteChatId(null);
    }
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuState(null);
        setConfirmDeleteChatId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuState(null);
        setConfirmDeleteChatId(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const menuChatId = menuState?.chatId ?? null;

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-6">
      {!desktopSidebarCollapsed ? (
        <div className="mb-2 px-2.5">
          <p className="text-[11.5px] font-medium tracking-[-0.01em] text-[var(--text-faint)]">Terkini</p>
        </div>
      ) : null}
      {authStatus !== "authenticated" ? (
        <p className={cn("text-[12.5px] leading-5 text-white/42", desktopSidebarCollapsed ? "px-1 text-center" : "px-2.5")}>
          Login dengan Google untuk menyimpan dan melihat riwayat chat.
        </p>
      ) : null}
      {authStatus === "authenticated" && recentChats.length === 0 ? (
        <p className={cn("text-[12.5px] leading-5 text-white/42", desktopSidebarCollapsed ? "px-1 text-center" : "px-2.5")}>
          Belum ada conversation yang tersimpan.
        </p>
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1",
          desktopSidebarCollapsed ? "pr-0" : ""
        )}
      >
        {recentChats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "group rounded-xl",
              chat.active
                ? "bg-[var(--bg-sidebar-hover)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {editingChatId === chat.id ? (
              <div className="flex h-9 w-full items-center gap-1 px-2.5">
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleRenameSave(chat.id);
                    }

                    if (event.key === "Escape") {
                      setEditingChatId(null);
                      setDraftTitle("");
                    }
                  }}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[13px] text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleRenameSave(chat.id)}
                  className="flex size-7 items-center justify-center rounded-lg text-white/75 hover:bg-white/8 hover:text-white"
                  aria-label="Simpan nama conversation"
                >
                  <Check className="size-4" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingChatId(null);
                    setDraftTitle("");
                    setMenuState(null);
                  }}
                  className="flex size-7 items-center justify-center rounded-lg text-white/75 hover:bg-white/8 hover:text-white"
                  aria-label="Batal ubah nama"
                >
                  <X className="size-4" strokeWidth={2.25} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => void activateRecentChat(chat.id)}
                    className={cn(
                      "flex h-9 min-w-0 flex-1 items-center text-left text-[13px] tracking-[-0.01em]",
                      desktopSidebarCollapsed ? "justify-center px-0" : "px-2.5"
                    )}
                    title={chat.title}
                  >
                    {!desktopSidebarCollapsed ? (
                      <span className="truncate leading-5">{chat.title}</span>
                    ) : (
                      <span className="max-w-[2.1rem] truncate text-[11px] uppercase text-white/56">
                        {chat.title.slice(0, 2)}
                      </span>
                    )}
                  </button>
                  {!desktopSidebarCollapsed ? <div className="pr-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();

                        setConfirmDeleteChatId(null);
                        setMenuState((current) =>
                          current?.chatId === chat.id
                            ? null
                            : {
                                chatId: chat.id,
                                top: rect.bottom + 6,
                                left: Math.max(12, rect.right - 176)
                              }
                        );
                      }}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg transition hover:bg-white/8 hover:text-white",
                        menuChatId === chat.id || chat.active
                          ? "text-white/72"
                          : "text-white/0 group-hover:text-white/60"
                      )}
                      aria-label="Buka menu conversation"
                    >
                      <MoreHorizontal className="size-4" strokeWidth={2.1} />
                    </button>
                  </div> : null}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {menuState && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] w-44 rounded-xl border border-white/10 bg-[#252525] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
              style={{
                top: menuState.top,
                left: menuState.left
              }}
            >
              {confirmDeleteChatId === menuState.chatId ? (
                <div className="space-y-2 p-1">
                  <p className="text-[11.5px] leading-4 text-white/70">
                    Hapus conversation ini?
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteChatId(null)}
                      className="flex-1 rounded-lg border border-white/10 px-2 py-1.5 text-[12px] text-white/78 hover:bg-white/7"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(menuState.chatId)}
                      className="flex-1 rounded-lg bg-[#8f3434] px-2 py-1.5 text-[12px] text-white hover:bg-[#a13c3c]"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const chat = recentChats.find((item) => item.id === menuState.chatId);

                      if (!chat) {
                        return;
                      }

                      setEditingChatId(chat.id);
                      setDraftTitle(chat.title);
                      setMenuState(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-white/84 hover:bg-white/7"
                  >
                    <Pencil className="size-3.5" strokeWidth={2.2} />
                    Edit nama
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteChatId(menuState.chatId)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-[#ffb4b4] hover:bg-white/7"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2.2} />
                    Hapus
                  </button>
                </>
              )}
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
