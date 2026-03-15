"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { ChatGptKnotIcon } from "@/components/chatgpt-knot-icon";
import { SidebarToggleIcon } from "@/components/chatgpt-ui-icons";
import { RecentChats } from "@/components/recent-chats";
import { SidebarNav } from "@/components/sidebar-nav";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const mobileSidebarOpen = useChatUiStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useChatUiStore((state) => state.setMobileSidebarOpen);

  function renderSidebarPanel() {
    return (
      <aside className="bg-sidebar flex h-full w-[var(--sidebar-width)] flex-col border-r border-white/[0.04] px-2.5 pb-3 pt-2.5">
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-xl text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-sidebar-hover)]"
            aria-label="Beranda Xynoos AI"
          >
            <ChatGptKnotIcon className="size-[1.28rem]" />
          </button>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-xl text-white/72 transition-colors duration-150 hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--icon-primary)]"
            aria-label="Tutup sidebar"
          >
            <SidebarToggleIcon className="size-[17px]" />
          </button>
        </div>
        <SidebarNav />
        <RecentChats />
      </aside>
    );
  }

  return (
    <>
      <div className="hidden h-full lg:block">{renderSidebarPanel()}</div>
      <AnimatePresence>
        {mobileSidebarOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Tutup sidebar"
              className="fixed inset-0 z-40 bg-[var(--bg-backdrop)] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              className={cn("fixed inset-y-0 left-0 z-50 lg:hidden")}
              initial={{ x: -24, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0.6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="absolute left-[calc(var(--sidebar-width)+0.5rem)] top-3">
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-xl border border-white/8 bg-[var(--bg-sidebar)] text-[var(--icon-muted)] shadow-subtle transition-colors duration-150 hover:text-[var(--icon-primary)]"
                  aria-label="Tutup menu"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <Menu className="size-[18px]" strokeWidth={2.05} />
                </button>
              </div>
              {renderSidebarPanel()}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
