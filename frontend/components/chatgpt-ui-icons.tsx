import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export type AppIconProps = {
  className?: string;
};

type SvgIconProps = SVGProps<SVGSVGElement> & AppIconProps;

function SvgIcon({ className, children, viewBox = "0 0 24 24", ...props }: SvgIconProps) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SidebarToggleIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <rect x="4.25" y="4.75" width="15.5" height="14.5" rx="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.8 5.6v12.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function NewChatIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <path d="M4.75 8.3a3.55 3.55 0 0 1 3.55-3.55h5.6" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <path d="M4.75 12v3.7a3.55 3.55 0 0 0 3.55 3.55h7.4a3.55 3.55 0 0 0 3.55-3.55V10.1" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.25 6.1 18.9 5.1l-1 5.65" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11.6 12.4 6.45-6.45" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function SearchIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <circle cx="10.4" cy="10.4" r="5.6" stroke="currentColor" strokeWidth="1.85" />
      <path d="m14.7 14.7 4.45 4.45" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function ImageStackIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <rect x="5.2" y="6" width="11.8" height="12.2" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 15.3 10.6 12l2.15 2.55 1.95-2.15 2.1 2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="9.8" r="1.15" fill="currentColor" />
      <path d="M8 4.75h7.9a2.85 2.85 0 0 1 2.85 2.85v7.65" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" opacity="0.9" />
    </SvgIcon>
  );
}

export function AppsIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <rect x="5.1" y="5.1" width="5.2" height="5.2" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.7" y="5.1" width="5.2" height="5.2" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="5.1" y="13.7" width="5.2" height="5.2" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.7" y="13.7" width="5.2" height="5.2" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </SvgIcon>
  );
}

export function ResearchIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <path d="M12.2 6.1c1.3-1.45 3.4-1.9 5.15-1.1a4.72 4.72 0 0 1 2.4 6.15l-.45 1.02-6.58-2.93.46-1.04Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m8.9 10.15 8.58 3.82-1.1 2.47a4.65 4.65 0 0 1-6.15 2.37c-2.34-1.05-3.4-3.79-2.36-6.13l1.03-2.53Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m6 17.55-.8 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m4.55 15.9-1.85.78" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function CodexIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <path d="m9.3 7.15-4.4 4.85 4.4 4.85" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14.7 7.15 4.4 4.85-4.4 4.85" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.9 18.9 13.3 5.1" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function CubeIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <path d="m12 4.9 6.35 3.65v7.1L12 19.3l-6.35-3.65v-7.1L12 4.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 19.3v-7.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m5.65 8.55 6.35 3.65 6.35-3.65" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function ProjectsIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <path d="M4.75 8.35a2.6 2.6 0 0 1 2.6-2.6h3.15l1.35 1.6h4.8a2.6 2.6 0 0 1 2.6 2.6v6.7a2.6 2.6 0 0 1-2.6 2.6H7.35a2.6 2.6 0 0 1-2.6-2.6v-8.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17.6 12h-4.95" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15.12 9.52v4.96" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function UsersIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <circle cx="9" cy="9.35" r="2.6" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="15.75" cy="10.25" r="2.1" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.8 17.85c.45-2.45 2.5-4.05 5.05-4.05 2.54 0 4.58 1.6 5.02 4.05" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14.7 17.25c.28-1.55 1.5-2.55 3.12-2.55 1.32 0 2.37.62 3.03 1.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function WorkspaceGemIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#4f46e5" />
      <path d="m12 5.8 4.55 2.55v5.3L12 16.2l-4.55-2.55v-5.3L12 5.8Z" fill="white" fillOpacity="0.95" />
      <path d="M12 16.2v-5.3" stroke="#4f46e5" strokeWidth="1.35" strokeLinecap="round" />
      <path d="m7.45 8.35 4.55 2.55 4.55-2.55" stroke="#4f46e5" strokeWidth="1.35" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function VoiceOrbIcon({ className }: AppIconProps) {
  return (
    <SvgIcon className={className} viewBox="0 0 24 24">
      <path d="M8.3 9.15v5.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M11.5 7.55v8.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14.7 9.15v5.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </SvgIcon>
  );
}