"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const models = useChatUiStore((state) => state.models);
  const selectedModelId = useChatUiStore((state) => state.selectedModelId);
  const modelMenuOpen = useChatUiStore((state) => state.modelMenuOpen);
  const setSelectedModel = useChatUiStore((state) => state.setSelectedModel);
  const setModelMenuOpen = useChatUiStore((state) => state.setModelMenuOpen);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const groupedModels = useMemo(() => {
    return models.reduce<Record<string, typeof models>>((accumulator, model) => {
      accumulator[model.group] ??= [];
      accumulator[model.group].push(model);
      return accumulator;
    }, {});
  }, [models]);

  const hasMultipleModels = useMemo(() => models.length > 1, [models.length]);

  useEffect(() => {
    if (!hasMultipleModels) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setModelMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModelMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [hasMultipleModels, setModelMenuOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup={hasMultipleModels ? "menu" : undefined}
        aria-expanded={hasMultipleModels ? modelMenuOpen : undefined}
        onClick={() => {
          if (hasMultipleModels) {
            setModelMenuOpen(!modelMenuOpen);
          }
        }}
        className="flex h-8 max-w-full items-center gap-1 rounded-lg px-2 text-[14px] font-medium tracking-[-0.012em] text-white/92 transition-colors duration-150 hover:bg-white/5"
      >
        <span className="truncate">{selectedModel.label}</span>
        {hasMultipleModels ? (
          <ChevronDown
            className={cn(
              "mt-px size-3 text-[var(--text-muted)] transition-transform duration-150",
              modelMenuOpen && "rotate-180"
            )}
            strokeWidth={2.15}
          />
        ) : null}
      </button>
      <AnimatePresence>
        {hasMultipleModels && modelMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="shadow-floating absolute left-0 top-[calc(100%+0.55rem)] z-40 w-[22rem] overflow-hidden rounded-[1.15rem] border border-white/10 bg-[var(--bg-dropdown)] p-2"
            role="menu"
          >
            {Object.entries(groupedModels).map(([group, groupModels], index) => (
              <div
                key={group}
                className={cn(
                  "px-1.5 py-1.5",
                  index > 0 && "mt-1 border-t border-white/7 pt-2.5"
                )}
              >
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  {group}
                </p>
                <div className="space-y-1">
                  {groupModels.map((model) => {
                    const selected = model.id === selectedModelId;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => setSelectedModel(model.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150",
                          selected
                            ? "bg-white/8"
                            : "hover:bg-white/5"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                              {model.label}
                            </span>
                            {model.multiplier ? (
                              <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                                {model.multiplier}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11.5px] leading-[1.1rem] text-[var(--text-muted)]">
                            {model.description}
                          </p>
                        </div>
                        <div className="pt-0.5">
                          {selected ? (
                            <Check className="size-4 text-[var(--icon-primary)]" strokeWidth={2.2} />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
