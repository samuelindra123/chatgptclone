"use client";

import { Menu } from "lucide-react";
import { LoginButton } from "@/components/login-button";
import { ModelSelector } from "@/components/model-selector";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

export function Topbar() {
  const setMobileSidebarOpen = useChatUiStore((state) => state.setMobileSidebarOpen);

  return (
    <header className="mx-auto flex h-[52px] w-full max-w-[var(--main-max-width)] shrink-0 items-center justify-between px-2 sm:px-1">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          aria-label="Buka menu"
          className="flex size-9 items-center justify-center rounded-xl text-[var(--icon-muted)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--icon-primary)] lg:hidden"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="size-[18px]" strokeWidth={2.05} />
        </button>
        <ModelSelector />
      </div>
      <div className="flex items-center justify-end">
        <LoginButton />
      </div>
    </header>
  );
}
