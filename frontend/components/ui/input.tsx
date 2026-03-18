import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#b79357]/35 focus:bg-white/[0.05]",
        className
      )}
      {...props}
    />
  );
}
