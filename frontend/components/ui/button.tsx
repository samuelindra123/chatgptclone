import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-medium tracking-[-0.015em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[linear-gradient(135deg,#d8b06a,#8b6a35)] px-4 text-[#14100a] shadow-[0_18px_40px_rgba(152,118,58,0.24)] hover:brightness-105",
        variant === "secondary" &&
          "border border-white/10 bg-white/[0.04] text-white/88 hover:bg-white/[0.07]",
        variant === "ghost" &&
          "text-white/70 hover:bg-white/[0.06] hover:text-white",
        size === "sm" && "h-9 px-3 text-[12px]",
        size === "md" && "h-11 px-4 text-[13px]",
        size === "lg" && "h-12 px-5 text-[14px]",
        className
      )}
      {...props}
    />
  );
}
