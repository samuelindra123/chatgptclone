"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Download, Images, Link2 } from "lucide-react";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

function GalleryActionButton({
  href,
  label,
  icon
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
}) {
  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download
      className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[12px] font-medium text-white/88 transition-colors duration-150 hover:border-white/18 hover:bg-black/55"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export function ImagesGallery() {
  const generatedImages = useChatUiStore((state) => state.generatedImages);
  const generatedImagesLoading = useChatUiStore((state) => state.generatedImagesLoading);
  const loadGeneratedImages = useChatUiStore((state) => state.loadGeneratedImages);

  useEffect(() => {
    void loadGeneratedImages();
  }, [loadGeneratedImages]);

  async function copyImage(imageUrl: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type || "image/png"]: blob
          })
        ]);
        return;
      }
    } catch {
      // Fall back to copying the image URL when binary clipboard access is unavailable.
    }

    await navigator.clipboard.writeText(imageUrl);
  }

  if (generatedImagesLoading) {
    return (
      <div className="mx-auto grid w-full max-w-[var(--main-max-width)] gap-4 px-2 pb-6 pt-3 sm:px-1 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.7rem] border border-white/8 bg-white/[0.035]"
          >
            <div className="aspect-[1.05/1] animate-pulse bg-white/[0.05]" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.05]" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-white/[0.05]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (generatedImages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-2 py-10 sm:px-1">
        <div className="max-w-xl rounded-[2rem] border border-white/8 bg-white/[0.03] px-7 py-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/80">
            <Images className="size-6" strokeWidth={2.05} />
          </div>
          <h1 className="text-[1.75rem] font-medium tracking-[-0.045em] text-white">
            Belum ada gambar
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-white/52">
            Pakai tool <span className="text-white/82">Create image</span> di composer untuk
            membuat gambar pertama. Semua hasilnya akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--main-max-width)] px-2 pb-6 pt-3 sm:px-1">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/42">
            Images
          </p>
          <h1 className="mt-1 text-[1.9rem] font-medium tracking-[-0.05em] text-white">
            Gallery hasil generate
          </h1>
        </div>
        <p className="text-[13px] text-white/42">{generatedImages.length} gambar</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {generatedImages.map((image) => (
          <article
            key={image.id}
            className="group overflow-hidden rounded-[1.7rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))]"
          >
            <div className="relative">
              <img
                src={image.imageUrl}
                alt={image.prompt ?? image.conversationTitle}
                className="aspect-[1.05/1] w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 via-black/28 to-transparent px-4 pb-4 pt-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => void copyImage(image.imageUrl)}
                  className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[12px] font-medium text-white/88 transition-colors duration-150 hover:border-white/18 hover:bg-black/55"
                >
                  <Link2 className="size-3.5" strokeWidth={2.1} />
                  Copy image
                </button>
                <GalleryActionButton
                  href={image.imageUrl}
                  label="Download"
                  icon={<Download className="size-3.5" strokeWidth={2.1} />}
                />
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/c/${image.conversationId}`}
                  className="truncate text-[14px] font-medium text-white/88 transition-colors hover:text-white"
                >
                  {image.conversationTitle}
                </Link>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-white/36">
                  {image.model ?? "image"}
                </span>
              </div>
              <p className="line-clamp-3 text-[13px] leading-6 text-white/56">
                {image.prompt ?? "Prompt tidak tersedia"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
