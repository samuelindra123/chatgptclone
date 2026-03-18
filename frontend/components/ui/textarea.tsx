import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[1.35rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-[13px] leading-6 text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#b79357]/35 focus:bg-white/[0.05]",
        className
      )}
      {...props}
    />
  );
}
