"use client";

import { FileText, Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

export function AttachmentPreviewStrip() {
  const previews = useChatUiStore((state) => state.previews);
  const removePreview = useChatUiStore((state) => state.removePreview);

  function handleRemove(previewId: string) {
    const preview = previews.find((item) => item.id === previewId);

    if (preview?.revokable) {
      URL.revokeObjectURL(preview.src);
    }

    removePreview(previewId);
  }

  if (previews.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {previews.map((preview) => (
        <div
          key={preview.id}
          className="group relative h-[74px] w-[112px] shrink-0 overflow-hidden rounded-[1.05rem] border border-white/[0.07] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
        >
          {preview.mimeType.startsWith("image/") ? (
            <Image
              src={preview.src}
              alt={preview.name}
              fill
              className="object-cover"
              sizes="112px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] text-white/75">
              {preview.mimeType === "application/pdf" ? (
                <FileText className="size-8" strokeWidth={1.9} />
              ) : (
                <ImageIcon className="size-8" strokeWidth={1.9} />
              )}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/68 to-transparent px-2 pb-2 pt-5">
            <p className="truncate text-[10.5px] font-medium tracking-[-0.01em] text-white/92">{preview.name}</p>
          </div>
          <button
            type="button"
            aria-label={`Hapus ${preview.name}`}
            onClick={() => handleRemove(preview.id)}
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border border-white/10 bg-black/42 text-white/88 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          >
            <X className="size-3.5" strokeWidth={2.3} />
          </button>
        </div>
      ))}
    </div>
  );
}
