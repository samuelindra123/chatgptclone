import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "muted" | "critical";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
        variant === "default" && "border-white/10 bg-white/[0.04] text-white/70",
        variant === "accent" && "border-[#d1a75d]/25 bg-[#c79a45]/10 text-[#e6cb98]",
        variant === "muted" && "border-[#5e6880]/25 bg-[#4f5d7a]/12 text-[#c3d1ef]",
        variant === "critical" && "border-[#b45050]/28 bg-[#8b2f2f]/12 text-[#f0b0b0]",
        className
      )}
      {...props}
    />
  );
}
