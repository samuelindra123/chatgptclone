"use client";

import { Clock3, ExternalLink, Globe2, Loader2 } from "lucide-react";
import type { ToolState } from "@/lib/api";

type AssistantToolStripProps = {
  toolStates?: ToolState[];
  isStreaming?: boolean;
};

const toolMeta = {
  current_datetime: {
    label: "Mencari waktu Indonesia"
  },
  web_search_duckduckgo: {
    label: "Mencari di web"
  }
} satisfies Record<ToolState["id"], { label: string }>;

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function parseDomains(value: string | number | boolean | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function SourceList({ sources }: { sources: NonNullable<ToolState["sources"]> }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Sources</p>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <a
            key={`${source.url}-${index}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/14 hover:bg-white/[0.04]"
          >
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-white/38" />
            <div className="min-w-0">
              <p className="line-clamp-1 text-[12px] font-medium text-white/84">{source.title}</p>
              <p className="line-clamp-1 text-[11px] text-white/42">{getHostname(source.url)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function AssistantToolStrip({ toolStates = [], isStreaming = false }: AssistantToolStripProps) {
  if (toolStates.length === 0) {
    return null;
  }

  const inlineTools = isStreaming ? toolStates.slice(-3) : [];
  const completedSearchTool = !isStreaming
    ? toolStates.find((tool) => tool.id === "web_search_duckduckgo" && tool.sources && tool.sources.length > 0)
    : undefined;

  return (
    <div className="mb-3">
      {isStreaming && inlineTools.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Tools</p>
          {inlineTools.map((tool) => {
            const query =
              typeof tool.metadata?.query === "string" && tool.metadata.query.trim()
                ? tool.metadata.query.trim()
                : null;
            const domains = [
              ...parseDomains(tool.metadata?.sourceDomains),
              ...(tool.sources?.slice(0, 4).map((source) => getHostname(source.url)) ?? [])
            ].filter((value, index, array) => array.indexOf(value) === index);

            return (
              <div key={`${tool.id}-${tool.timestamp}`} className="space-y-1.5">
                <div className="flex items-center gap-2 text-[13px] text-white/68">
                  {tool.id === "current_datetime" ? (
                    <Clock3 className="size-3.5 shrink-0" strokeWidth={2} />
                  ) : (
                    <Globe2 className="size-3.5 shrink-0" strokeWidth={2} />
                  )}
                  {tool.status === "running" ? (
                    <Loader2 className="size-3 shrink-0 animate-spin text-white/38" strokeWidth={2} />
                  ) : null}
                  <span className="line-clamp-1">
                    {tool.detail || toolMeta[tool.id].label}
                  </span>
                </div>

                {query ? (
                  <p className="pl-[1.15rem] text-[12px] text-white/48">
                    Query: <span className="text-white/72">{query}</span>
                  </p>
                ) : null}

                {domains.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pl-[1.15rem]">
                    {domains.map((domain) => (
                      <span
                        key={`${tool.id}-${domain}`}
                        className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/62"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {completedSearchTool?.sources ? <SourceList sources={completedSearchTool.sources} /> : null}
    </div>
  );
}
