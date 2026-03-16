"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ChatGptKnotIcon } from "@/components/chatgpt-knot-icon";
import { RecentChats } from "@/components/recent-chats";
import { SidebarNav } from "@/components/sidebar-nav";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const mobileSidebarOpen = useChatUiStore((state) => state.mobileSidebarOpen);
  const desktopSidebarCollapsed = useChatUiStore((state) => state.desktopSidebarCollapsed);
  const setMobileSidebarOpen = useChatUiStore((state) => state.setMobileSidebarOpen);
  const toggleDesktopSidebar = useChatUiStore((state) => state.toggleDesktopSidebar);

  function renderSidebarPanel() {
    return (
      <aside
        className={cn(
          "bg-sidebar flex h-full flex-col border-r border-white/[0.04] pb-3 pt-2.5 transition-[width,padding] duration-200",
          desktopSidebarCollapsed ? "w-[4.5rem] px-2" : "w-[var(--sidebar-width)] px-2.5"
        )}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          {!desktopSidebarCollapsed ? (
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-xl text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-sidebar-hover)]"
              aria-label="Beranda Xynoos AI"
            >
              <ChatGptKnotIcon className="size-[1.28rem]" />
            </button>
          ) : (
            <div className="size-9" />
          )}
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-xl text-white/72 transition-colors duration-150 hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--icon-primary)]"
            aria-label={desktopSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            onClick={toggleDesktopSidebar}
          >
            {desktopSidebarCollapsed ? (
              <PanelLeftOpen className="size-[17px]" strokeWidth={2.05} />
            ) : (
              <PanelLeftClose className="size-[17px]" strokeWidth={2.05} />
            )}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarNav />
          {!desktopSidebarCollapsed ? <RecentChats /> : null}
        </div>
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
