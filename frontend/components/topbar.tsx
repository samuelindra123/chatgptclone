"use client";

import { Menu, PanelLeftOpen } from "lucide-react";
import { LoginButton } from "@/components/login-button";
import { ModelSelector } from "@/components/model-selector";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

export function Topbar() {
  const setMobileSidebarOpen = useChatUiStore((state) => state.setMobileSidebarOpen);
  const desktopSidebarCollapsed = useChatUiStore((state) => state.desktopSidebarCollapsed);
  const toggleDesktopSidebar = useChatUiStore((state) => state.toggleDesktopSidebar);

  return (
    <header className="mx-auto flex h-[52px] w-full max-w-[var(--main-max-width)] shrink-0 items-center justify-between px-2 sm:px-1">
      <div className="flex min-w-0 items-center gap-1">
        {desktopSidebarCollapsed ? (
          <button
            type="button"
            aria-label="Buka sidebar"
            className="hidden size-9 items-center justify-center rounded-xl text-[var(--icon-muted)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--icon-primary)] lg:flex"
            onClick={toggleDesktopSidebar}
          >
            <PanelLeftOpen className="size-[18px]" strokeWidth={2.05} />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Buka menu"
          className="flex size-9 items-center justify-center rounded-xl text-[var(--icon-muted)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--icon-primary)] lg:hidden"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="size-[18px]" strokeWidth={2.05} />
        </button>
        {desktopSidebarCollapsed ? <span className="hidden text-[13px] text-white/44 lg:inline">Xynoos AI</span> : null}
        <ModelSelector />
      </div>
      <div className="flex items-center justify-end">
        <LoginButton />
      </div>
    </header>
  );
}
