import { cn } from "@/lib/utils";

type ChatGptKnotIconProps = {
  className?: string;
};

export function ChatGptKnotIcon({ className }: ChatGptKnotIconProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {Array.from({ length: 6 }).map((_, index) => (
          <path
            key={index}
            d="M22 7.9c2.78-1.6 6.34-.65 7.96 2.13l2.22 3.84c1.61 2.79.65 6.35-2.13 7.96l-3.75 2.17c-2.79 1.61-6.35.66-7.96-2.13l-2.22-3.84c-1.62-2.78-.67-6.34 2.12-7.96L22 7.9Z"
            transform={`rotate(${index * 60} 22 22)`}
          />
        ))}
      </g>
    </svg>
  );
}
