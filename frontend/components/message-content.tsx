"use client";

import { Download, Link2, MessageSquareText, Info } from "lucide-react";
import { AssistantToolStrip } from "@/components/assistant-tool-strip";
import type { ToolState } from "@/lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type MessageContentProps = {
  content: string;
  isStreaming?: boolean;
  isImageGeneration?: boolean;
  toolStates?: ToolState[];
};

function getLanguageLabel(className?: string) {
  const match = className?.match(/language-([\w-]+)/i);

  return match?.[1] ?? null;
}

function GeneratedImage({
  src,
  alt
}: {
  src: string;
  alt: string;
}) {
  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      const response = await fetch(src);
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

    await navigator.clipboard.writeText(src);
  }

  return (
    <span className="group relative my-4 block overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <img
        src={src}
        alt={alt}
        className="w-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/78 via-black/24 to-transparent px-4 pb-4 pt-12 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[12px] font-medium text-white/88 transition-colors duration-150 hover:border-white/18 hover:bg-black/55"
        >
          <Link2 className="size-3.5" strokeWidth={2.1} />
          Copy image
        </button>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          download
          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[12px] font-medium text-white/88 transition-colors duration-150 hover:border-white/18 hover:bg-black/55"
        >
          <Download className="size-3.5" strokeWidth={2.1} />
          Download
        </a>
      </span>
    </span>
  );
}

function ImageGenerationStatus({ content }: { content: string }) {
  const isRendering = content.includes("Membuat gambar");
  const statusLabel = isRendering ? "Merender gambar" : "Mengoptimalkan prompt";

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))]">
        <div className="aspect-[1.2/1] animate-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.1),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
        <div className="border-t border-white/8 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#9ad0ff] animate-pulse" />
            <p className="text-[13px] font-medium text-white/84">{statusLabel}</p>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-white/46">
            Hasil akan muncul otomatis saat Qwen selesai membuat gambar.
          </p>
        </div>
      </div>
      {content ? (
        <p className="text-[12px] leading-5 text-white/42">{content.trim()}</p>
      ) : null}
    </div>
  );
}

export function MessageContent({
  content,
  isStreaming = false,
  isImageGeneration = false,
  toolStates
}: MessageContentProps) {
  if (!content && isStreaming) {
    if (isImageGeneration) {
      return <ImageGenerationStatus content="" />;
    }

    return (
      <div>
        <AssistantToolStrip toolStates={toolStates} isStreaming={isStreaming} />
        <div className="flex items-center gap-1.5 py-1 text-white/60">
          <span className="size-2 animate-pulse rounded-full bg-white/45 [animation-delay:-0.2s]" />
          <span className="size-2 animate-pulse rounded-full bg-white/45 [animation-delay:-0.1s]" />
          <span className="size-2 animate-pulse rounded-full bg-white/45" />
        </div>
      </div>
    );
  }

  if (isStreaming && isImageGeneration) {
    return <ImageGenerationStatus content={content} />;
  }

  return (
    <div>
      <AssistantToolStrip toolStates={toolStates} isStreaming={isStreaming} />
      <div className="message-rich text-[15px] leading-7 tracking-[-0.01em]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children, node }) => {
              const language = getLanguageLabel(className);
              const isInline = !node?.position?.start.line || !className;

              if (isInline) {
                return (
                  <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-[0.9em] text-[#ffd89a]">
                    {children}
                  </code>
                );
              }

              return (
                <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
                  <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-4 py-2.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/52">
                      {language ?? "plain text"}
                    </span>
                  </div>
                  <SyntaxHighlighter
                    language={language ?? "text"}
                    style={oneDark}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      background: "transparent",
                      overflowX: "auto",
                      fontSize: "13px",
                      lineHeight: "1.7"
                    }}
                    codeTagProps={{
                      className: cn("font-mono text-[13px]", className)
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              );
            },
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full border-collapse text-left text-[14px]">{children}</table>
              </div>
            ),
            img: ({ src, alt }) =>
              typeof src === "string" ? (
                <GeneratedImage src={src} alt={typeof alt === "string" ? alt : "Generated image"} />
              ) : null,
            th: ({ children }) => (
              <th className="border-b border-white/10 bg-white/6 px-4 py-3 font-semibold text-white">
                {children}
              </th>
            ),
            td: ({ children }) => <td className="border-t border-white/7 px-4 py-3 text-white/82">{children}</td>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-white/18 pl-4 text-white/70 italic">
                {children}
              </blockquote>
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
