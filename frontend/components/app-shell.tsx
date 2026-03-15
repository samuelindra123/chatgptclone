"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Composer } from "@/components/composer";
import { ConversationFeed } from "@/components/conversation-feed";
import { Disclaimer } from "@/components/disclaimer";
import { EmptyState } from "@/components/empty-state";
import { ImagesGallery } from "@/components/images-gallery";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useChatUiStore } from "@/lib/store/chatgpt-ui";

type AppShellProps = {
  initialConversationId?: string | null;
  initialView?: "chat" | "images";
};

export function AppShell({ initialConversationId = null, initialView = "chat" }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initializeApp = useChatUiStore((state) => state.initializeApp);
  const syncConversationFromRoute = useChatUiStore((state) => state.syncConversationFromRoute);
  const activateNavItem = useChatUiStore((state) => state.activateNavItem);
  const loadGeneratedImages = useChatUiStore((state) => state.loadGeneratedImages);
  const messages = useChatUiStore((state) => state.messages);
  const initializing = useChatUiStore((state) => state.initializing);
  const selectedConversationId = useChatUiStore((state) => state.selectedConversationId);
  const currentView = useChatUiStore((state) => state.currentView);
  const recentChats = useChatUiStore((state) => state.recentChats);
  const hasConversation = messages.length > 0;
  const activeConversation = recentChats.find((chat) => chat.id === selectedConversationId);

  useEffect(() => {
    void initializeApp(initialConversationId);
  }, [initialConversationId, initializeApp]);

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (initialView === "images") {
      activateNavItem("images");
      void loadGeneratedImages();
      return;
    }

    void syncConversationFromRoute(initialConversationId);
  }, [activateNavItem, initialConversationId, initialView, initializing, loadGeneratedImages, syncConversationFromRoute]);

  useEffect(() => {
    if (initializing) {
      return;
    }

    const nextPath =
      currentView === "images"
        ? "/images"
        : selectedConversationId
          ? `/c/${selectedConversationId}`
          : "/";

    if (pathname !== nextPath) {
      router.replace(nextPath);
    }
  }, [currentView, initializing, pathname, router, selectedConversationId]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = activeConversation?.title
      ? `${activeConversation.title} | Xynoos AI`
      : "Xynoos AI";
  }, [activeConversation?.title]);

  return (
    <div className="bg-app flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex min-h-0 flex-1 flex-col px-2 pb-3 sm:px-4 lg:px-5">
          <div className="mx-auto flex h-full w-full max-w-[var(--main-max-width)] flex-col">
            {initializing ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-white/55">Memuat workspace...</p>
              </div>
            ) : null}
            {!initializing && currentView === "images" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <ImagesGallery />
              </div>
            ) : null}
            {!initializing && currentView === "chat" && hasConversation ? (
              <>
                <ConversationFeed />
                <div className="flex w-full justify-center pb-2 pt-1.5 sm:pb-3">
                  <div className="w-full">
                    <Composer />
                    <Disclaimer />
                  </div>
                </div>
              </>
            ) : null}
            {!initializing && currentView === "chat" && !hasConversation ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="w-full pb-8">
                  <div className="mb-7 sm:mb-8">
                    <EmptyState />
                  </div>
                  <Composer />
                  <Disclaimer />
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
