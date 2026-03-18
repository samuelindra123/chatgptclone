"use client";

import type { ChangeEvent, ClipboardEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Paperclip, Plus, X } from "lucide-react";
import { AttachmentPreviewStrip } from "@/components/attachment-preview-strip";
import type { AttachmentPreview } from "@/lib/mock-data";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { cn } from "@/lib/utils";

type ToolDefinition = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

function createFilePreview(file: File): AttachmentPreview {
  return {
    id: `${file.name}-${file.lastModified}`,
    name: file.name,
    src: URL.createObjectURL(file),
    file,
    mimeType: file.type,
    revokable: true
  };
}

export function Composer() {
  const composerText = useChatUiStore((state) => state.composerText);
  const previews = useChatUiStore((state) => state.previews);
  const activeToolIds = useChatUiStore((state) => state.activeToolIds);
  const authStatus = useChatUiStore((state) => state.authStatus);
  const isSending = useChatUiStore((state) => state.isSending);
  const errorMessage = useChatUiStore((state) => state.errorMessage);
  const setComposerText = useChatUiStore((state) => state.setComposerText);
  const addPreviews = useChatUiStore((state) => state.addPreviews);
  const clearPreviews = useChatUiStore((state) => state.clearPreviews);
  const addActiveTool = useChatUiStore((state) => state.addActiveTool);
  const removeActiveTool = useChatUiStore((state) => state.removeActiveTool);
  const beginGoogleLogin = useChatUiStore((state) => state.beginGoogleLogin);
  const sendMessage = useChatUiStore((state) => state.sendMessage);
  const stopMessageGeneration = useChatUiStore((state) => state.stopMessageGeneration);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewsRef = useRef(previews);
  const toolMenuRef = useRef<HTMLDivElement | null>(null);
  const isAuthenticated = authStatus === "authenticated";
  const [toolMenuOpen, setToolMenuOpen] = useState(false);

  function resizeTextarea() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const maxHeight = 176;
    const minHeight = 44;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(nextHeight, minHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  const canSend = composerText.trim().length > 0 || previews.length > 0;
  const activeToolLabels = useMemo(() => {
    const toolLabelMap: Record<string, string> = {
      "create-image": "Create image"
    };

    return activeToolIds
      .filter((toolId) => toolId !== "upload")
      .map((toolId) => ({
        id: toolId,
        label: toolLabelMap[toolId] ?? toolId
      }));
  }, [activeToolIds]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [composerText]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => {
        if (preview.revokable) {
          URL.revokeObjectURL(preview.src);
        }
      });
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!toolMenuRef.current?.contains(event.target as Node)) {
        setToolMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setToolMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function revokeRevokablePreviews() {
    previews.forEach((preview) => {
      if (preview.revokable) {
        URL.revokeObjectURL(preview.src);
      }
    });
  }

  function handleRemoveTool(toolId: string) {
    if (toolId === "upload") {
      previews.forEach((preview) => {
        if (preview.revokable) {
          URL.revokeObjectURL(preview.src);
        }
      });
      clearPreviews();
    }

    removeActiveTool(toolId);
  }

  async function handleSend() {
    if (!canSend) {
      return;
    }

    if (!isAuthenticated) {
      beginGoogleLogin();
      return;
    }

    const success = await sendMessage();

    if (success) {
      revokeRevokablePreviews();
      requestAnimationFrame(() => {
        resizeTextarea();
      });
    }
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    addPreviews(files.map(createFilePreview));
    addActiveTool("upload");
    event.target.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const clipboardFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
      .filter((file) => file.type.startsWith("image/") || file.type === "application/pdf");

    if (clipboardFiles.length === 0) {
      return;
    }

    event.preventDefault();
    addPreviews(clipboardFiles.map(createFilePreview));
    addActiveTool("upload");
  }

  const tools: ToolDefinition[] = [
    {
      id: "upload",
      label: "Upload file",
      description: "Lampirkan gambar atau file ke pesan berikutnya",
      icon: <Paperclip className="size-4" strokeWidth={2.1} />,
      onSelect: () => {
        addActiveTool("upload");
        inputRef.current?.click();
        setToolMenuOpen(false);
      }
    },
    {
      id: "create-image",
      label: "Create image",
      description: "Optimalkan prompt lalu buat gambar dengan Xynoos Image",
      icon: <ImagePlus className="size-4" strokeWidth={2.05} />,
      onSelect: () => {
        addActiveTool("create-image");
        setToolMenuOpen(false);
      }
    }
  ];

  return (
    <div className="mx-auto w-full max-w-[var(--composer-width)]">
      <div className="surface-composer relative overflow-visible rounded-[1.55rem] border border-white/[0.055] bg-[var(--bg-surface-elevated)] transition-[border-color,background-color,box-shadow,transform] duration-150 focus-within:border-white/[0.09] focus-within:bg-[var(--bg-surface-strong)] sm:rounded-[1.6rem]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.045),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.018),transparent_22%,rgba(0,0,0,0.04))]" />
        <div className="relative space-y-2 px-3 pb-2.5 pt-2 sm:px-3.5">
          <AnimatePresence initial={false}>
            {previews.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
              >
                <AttachmentPreviewStrip />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {activeToolLabels.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="flex flex-wrap gap-2"
              >
                {activeToolLabels.map((tool) => (
                  <div
                    key={tool.id}
                    className="group flex h-7 items-center gap-2 rounded-full border border-white/9 bg-white/[0.05] pl-3 pr-2 text-[12px] font-medium text-white/82"
                  >
                    <span>{tool.label}</span>
                    <button
                      type="button"
                      aria-label={`Hapus ${tool.label}`}
                      onClick={() => handleRemoveTool(tool.id)}
                      className="flex size-5 items-center justify-center rounded-full text-white/42 opacity-0 transition-all duration-150 hover:bg-white/10 hover:text-white/78 group-hover:opacity-100"
                    >
                      <X className="size-3.5" strokeWidth={2.3} />
                    </button>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={composerText}
              onChange={(event) => {
                setComposerText(event.target.value);
                resizeTextarea();
              }}
              onPaste={handlePaste}
              placeholder={
                isAuthenticated
                  ? "Tanyakan apa pun"
                  : "Login dengan Google untuk mulai chat dan menyimpan riwayat"
              }
              rows={1}
              className="h-11 max-h-44 min-h-[44px] w-full resize-none overflow-y-hidden bg-transparent py-[10px] pl-10 pr-[3.35rem] text-[15px] leading-6 tracking-[-0.012em] text-[var(--text-primary)] outline-none transition-[height] duration-150 ease-out placeholder:text-white/40 sm:text-[15.5px]"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between">
              <div className="pointer-events-auto relative" ref={toolMenuRef}>
                <button
                  type="button"
                  aria-label="Buka menu tools"
                  onClick={() => setToolMenuOpen((current) => !current)}
                className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.028] text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] transition-all duration-150 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
                >
                  <Plus className="size-4" strokeWidth={2.2} />
                </button>
                <AnimatePresence>
                  {toolMenuOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="shadow-floating absolute bottom-[calc(100%+0.45rem)] left-0 z-40 w-[18rem] overflow-hidden rounded-[1.15rem] border border-white/10 bg-[var(--bg-dropdown)] p-2"
                    >
                      <div className="space-y-1">
                        {tools.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={tool.onSelect}
                            className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/6"
                          >
                            <div className="mt-0.5 flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/82">
                              {tool.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-white">{tool.label}</p>
                              <p className="mt-1 text-[11.5px] leading-[1.1rem] text-white/58">
                                {tool.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              <div className="pointer-events-auto ml-auto">
                <button
                  type="button"
                  aria-label={isSending ? "Hentikan jawaban" : canSend ? (isAuthenticated ? "Kirim pesan" : "Login dengan Google") : "Kirim pesan"}
                  disabled={!isSending && !canSend}
                  onClick={() => {
                    if (isSending) {
                      stopMessageGeneration();
                      return;
                    }

                    void handleSend();
                  }}
                  className={cn(
                    "flex size-[30px] items-center justify-center rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-all duration-150 active:scale-[0.985]",
                    isSending
                      ? "bg-white text-black hover:bg-white/92"
                      : canSend
                        ? "bg-white text-black hover:bg-white/92"
                        : "bg-white/[0.05] text-white/35"
                  )}
                >
                  {isSending ? (
                    <span className="block size-3 rounded-[2px] bg-current" />
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-[15px]">
                      <path d="M10 14.4V5.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="m6.7 9.15 3.3-3.35 3.3 3.35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          {errorMessage ? (
            <p className="text-[12px] text-[#ffb4b4]">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
