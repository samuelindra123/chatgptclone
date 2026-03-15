"use client";

import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const items = useChatUiStore((state) => state.sidebarItems);
  const activateNavItem = useChatUiStore((state) => state.activateNavItem);

  return (
    <nav className="space-y-0.5 pt-0.5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => activateNavItem(item.id)}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-normal tracking-[-0.012em] transition-colors duration-150",
              item.active
                ? "bg-[var(--bg-sidebar-active)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon className="size-[18px] text-[var(--icon-primary)]/90" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
