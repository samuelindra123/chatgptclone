import type { ComponentType } from "react";
import {
  ImageStackIcon,
  NewChatIcon,
  SearchIcon
} from "@/components/chatgpt-ui-icons";
import type { AppIconProps } from "@/components/chatgpt-ui-icons";

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: ComponentType<AppIconProps>;
  active?: boolean;
};

export type RecentConversation = {
  id: string;
  title: string;
  active?: boolean;
};

export type ModelOption = {
  id: string;
  label: string;
  description: string;
  multiplier?: string;
  group: string;
};

export type AttachmentPreview = {
  id: string;
  name: string;
  src: string;
  file: File;
  mimeType: string;
  revokable?: boolean;
};

export type SubmittedPrompt = {
  id: string;
  text: string;
  attachmentCount: number;
};

function createSvgDataUrl(label: string, start: string, end: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="112" viewBox="0 0 160 112" fill="none">
      <defs>
        <linearGradient id="g" x1="14" y1="14" x2="146" y2="98" gradientUnits="userSpaceOnUse">
          <stop stop-color="${start}" />
          <stop offset="1" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="160" height="112" rx="18" fill="url(#g)" />
      <circle cx="124" cy="34" r="22" fill="white" fill-opacity="0.10" />
      <circle cx="42" cy="86" r="30" fill="white" fill-opacity="0.08" />
      <path d="M20 78c18-18 30-26 42-26 12 0 24 8 42 24l18 16H20V78Z" fill="white" fill-opacity="0.16" />
      <text x="20" y="26" fill="white" fill-opacity="0.92" font-size="13" font-family="Inter, Arial, sans-serif">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const sidebarNavItems: SidebarNavItem[] = [
  {
    id: "new-chat",
    label: "New chat",
    icon: NewChatIcon,
    active: true
  },
  {
    id: "search",
    label: "Search",
    icon: SearchIcon
  },
  {
    id: "images",
    label: "Images",
    icon: ImageStackIcon
  }
];

export const recentConversations: RecentConversation[] = [
  { id: "r1", title: "Greeting exchange", active: true },
  { id: "r2", title: "Rekomendasi Model UI Chat..." },
  { id: "r3", title: "Analisa Judul Deskripsi Tag" },
  { id: "r4", title: "Kemampuan Tablet Advan 8..." },
  { id: "r5", title: "Kartu ucapan Idul Fitri" }
];

export const modelOptions: ModelOption[] = [
  {
    id: "xynoos-ai-v1",
    label: "Xynoos AI v1",
    description:
      "Asisten AI utama Xynoos buatan Samuel Indra Bastian untuk chat, analisis, coding, belajar, tabel, dan matematika",
    group: "Model"
  }
];

export const initialPreviews: AttachmentPreview[] = [];
