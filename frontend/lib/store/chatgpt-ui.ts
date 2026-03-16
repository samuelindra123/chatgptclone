"use client";

import { create } from "zustand";
import {
  buildGoogleAuthStartUrl,
  clearSessionToken,
  deleteConversation as deleteConversationRequest,
  fetchConversation,
  fetchConversations,
  fetchCurrentUser,
  fetchGeneratedImages,
  readSessionToken,
  renameConversation as renameConversationRequest,
  streamConversationReply,
  writeSessionToken,
  type AuthUser,
  type ConversationMessage,
  type ConversationSummary,
  type GeneratedImageItem,
  type ToolState
} from "@/lib/api";
import {
  initialPreviews,
  modelOptions,
  sidebarNavItems,
  type AttachmentPreview,
  type ModelOption,
  type RecentConversation,
  type SidebarNavItem
} from "@/lib/mock-data";

type ChatUiState = {
  currentView: "chat" | "images";
  sidebarItems: SidebarNavItem[];
  recentChats: RecentConversation[];
  generatedImages: GeneratedImageItem[];
  generatedImagesLoading: boolean;
  models: ModelOption[];
  selectedModelId: string;
  modelMenuOpen: boolean;
  mobileSidebarOpen: boolean;
  desktopSidebarCollapsed: boolean;
  composerText: string;
  previews: AttachmentPreview[];
  activeToolIds: string[];
  messages: ConversationMessage[];
  selectedConversationId: string | null;
  currentUser: AuthUser | null;
  authStatus: "idle" | "loading" | "authenticated" | "unauthenticated";
  initializing: boolean;
  isSending: boolean;
  errorMessage: string | null;
  thinkingMode: boolean;
  activeStreamController: AbortController | null;
  setSelectedModel: (id: string) => void;
  setModelMenuOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  toggleDesktopSidebar: () => void;
  setComposerText: (value: string) => void;
  addPreviews: (items: AttachmentPreview[]) => void;
  removePreview: (id: string) => void;
  clearPreviews: () => void;
  addActiveTool: (id: string) => void;
  removeActiveTool: (id: string) => void;
  toggleThinkingMode: () => void;
  loadGeneratedImages: () => Promise<void>;
  initializeApp: (preferredConversationId?: string | null) => Promise<void>;
  syncConversationFromRoute: (conversationId: string | null) => Promise<void>;
  completeGoogleLogin: (token: string) => Promise<void>;
  beginGoogleLogin: () => void;
  logout: () => void;
  activateNavItem: (id: string) => void;
  activateRecentChat: (id: string) => Promise<void>;
  renameRecentChat: (id: string, title: string) => Promise<boolean>;
  deleteRecentChat: (id: string) => Promise<boolean>;
  sendMessage: () => Promise<boolean>;
  stopMessageGeneration: () => void;
};

function setRecentChats(
  conversations: ConversationSummary[],
  activeConversationId: string | null
) {
  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    active: conversation.id === activeConversationId
  }));
}

function setSidebarMode(items: SidebarNavItem[], selectedConversationId: string | null, activeId?: string) {
  if (activeId) {
    return items.map((item) => ({
      ...item,
      active: item.id === activeId
    }));
  }

  return items.map((item) => ({
    ...item,
    active: item.id === "new-chat" ? selectedConversationId === null : false
  }));
}

function upsertToolState(toolStates: ToolState[] | undefined, nextTool: ToolState) {
  const currentToolStates = toolStates ?? [];
  const existingIndex = currentToolStates.findIndex((tool) => tool.id === nextTool.id);

  if (existingIndex === -1) {
    return [...currentToolStates, nextTool];
  }

  return currentToolStates.map((tool, index) => (index === existingIndex ? nextTool : tool));
}

function completeToolStates(toolStates: ToolState[] | undefined): ToolState[] | undefined {
  return toolStates?.map((tool) => ({
    ...tool,
    status: "completed" as const
  }));
}

export const useChatUiStore = create<ChatUiState>((set, get) => ({
  sidebarItems: sidebarNavItems,
  currentView: "chat",
  recentChats: [],
  generatedImages: [],
  generatedImagesLoading: false,
  models: modelOptions,
  selectedModelId: "xynoos-ai-v1",
  modelMenuOpen: false,
  mobileSidebarOpen: false,
  desktopSidebarCollapsed: false,
  composerText: "",
  previews: initialPreviews,
  activeToolIds: [],
  messages: [],
  selectedConversationId: null,
  currentUser: null,
  authStatus: "idle",
  initializing: true,
  isSending: false,
  errorMessage: null,
  thinkingMode: false,
  activeStreamController: null,
  setSelectedModel: (id) =>
    set({
      selectedModelId: id,
      modelMenuOpen: false
    }),
  setModelMenuOpen: (open) => set({ modelMenuOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setDesktopSidebarCollapsed: (collapsed) => set({ desktopSidebarCollapsed: collapsed }),
  toggleDesktopSidebar: () =>
    set((state) => ({
      desktopSidebarCollapsed: !state.desktopSidebarCollapsed
    })),
  setComposerText: (value) => set({ composerText: value }),
  addPreviews: (items) =>
    set((state) => ({
      previews: [...state.previews, ...items]
    })),
  removePreview: (id) =>
    set((state) => ({
      previews: state.previews.filter((preview) => preview.id !== id)
    })),
  clearPreviews: () => set({ previews: [] }),
  addActiveTool: (id) =>
    set((state) => ({
      activeToolIds: state.activeToolIds.includes(id) ? state.activeToolIds : [...state.activeToolIds, id],
      thinkingMode: id === "reason" ? true : state.thinkingMode
    })),
  removeActiveTool: (id) =>
    set((state) => ({
      activeToolIds: state.activeToolIds.filter((toolId) => toolId !== id),
      thinkingMode: id === "reason" ? false : state.thinkingMode
    })),
  toggleThinkingMode: () =>
    set((state) => ({
      thinkingMode: !state.thinkingMode,
      activeToolIds: state.thinkingMode
        ? state.activeToolIds.filter((toolId) => toolId !== "reason")
        : state.activeToolIds.includes("reason")
          ? state.activeToolIds
          : [...state.activeToolIds, "reason"]
    })),
  loadGeneratedImages: async () => {
    const token = readSessionToken();

    if (!token) {
      set({ generatedImages: [], generatedImagesLoading: false });
      return;
    }

    set({ generatedImagesLoading: true, errorMessage: null });

    try {
      const { images } = await fetchGeneratedImages(token);
      set({
        generatedImages: images,
        generatedImagesLoading: false,
        errorMessage: null
      });
    } catch (error) {
      set({
        generatedImages: [],
        generatedImagesLoading: false,
        errorMessage: error instanceof Error ? error.message : "Gagal memuat gallery gambar"
      });
    }
  },
  initializeApp: async (preferredConversationId = null) => {
    const token = readSessionToken();
    const currentState = get();

    if (!token) {
      set({
        currentUser: null,
        authStatus: "unauthenticated",
        initializing: false,
        recentChats: [],
        generatedImages: [],
        messages: [],
        selectedConversationId: null,
        currentView: "chat",
        errorMessage: null,
        sidebarItems: setSidebarMode(get().sidebarItems, null)
      });
      return;
    }

    if (
      currentState.authStatus === "authenticated" &&
      currentState.currentUser &&
      !currentState.initializing
    ) {
      const nextConversationId =
        preferredConversationId === undefined
          ? currentState.selectedConversationId
          : preferredConversationId;

      set((state) => ({
        initializing: false,
        selectedConversationId: nextConversationId ?? null,
        currentView: currentState.currentView,
        recentChats: state.recentChats.map((chat) => ({
          ...chat,
          active: chat.id === (nextConversationId ?? null)
        })),
        sidebarItems: setSidebarMode(state.sidebarItems, nextConversationId ?? null),
        errorMessage: null
      }));
      return;
    }

    set({
      authStatus: "loading",
      initializing: true,
      errorMessage: null
    });

    try {
      const [{ user }, { conversations }] = await Promise.all([
        fetchCurrentUser(token),
        fetchConversations(token)
      ]);
      const selectedConversationId =
        preferredConversationId === null
          ? null
          : preferredConversationId && conversations.some((conversation) => conversation.id === preferredConversationId)
            ? preferredConversationId
            : (conversations[0]?.id ?? null);

      set({
        currentUser: user,
        authStatus: "authenticated",
        recentChats: setRecentChats(conversations, selectedConversationId),
        selectedConversationId,
        currentView: "chat",
        sidebarItems: setSidebarMode(get().sidebarItems, selectedConversationId),
        initializing: false,
        errorMessage: null
      });

      if (selectedConversationId) {
        const detail = await fetchConversation(selectedConversationId, token);
        set({
          messages: detail.messages
        });
      } else {
        set({
          messages: []
        });
      }
    } catch (error) {
      clearSessionToken();
      set({
        currentUser: null,
        authStatus: "unauthenticated",
        initializing: false,
        recentChats: [],
        generatedImages: [],
        messages: [],
        selectedConversationId: null,
        currentView: "chat",
        errorMessage: error instanceof Error ? error.message : "Gagal memuat sesi",
        sidebarItems: setSidebarMode(get().sidebarItems, null)
      });
    }
  },
  syncConversationFromRoute: async (conversationId) => {
    const token = readSessionToken();

    if (!token) {
      return;
    }

    const { selectedConversationId, recentChats, messages } = get();

    if (conversationId === null) {
      set((state) => ({
        currentView: "chat",
        selectedConversationId: null,
        messages: [],
        recentChats: state.recentChats.map((chat) => ({
          ...chat,
          active: false
        })),
        sidebarItems: setSidebarMode(state.sidebarItems, null),
        errorMessage: null
      }));
      return;
    }

    if (selectedConversationId === conversationId && messages.length > 0) {
      return;
    }

    const knownConversation = recentChats.find((chat) => chat.id === conversationId);

    set((state) => ({
      currentView: "chat",
      selectedConversationId: conversationId,
      recentChats: state.recentChats.map((chat) => ({
        ...chat,
        active: chat.id === conversationId
      })),
      sidebarItems: setSidebarMode(state.sidebarItems, conversationId),
      messages: knownConversation ? state.messages : [],
      errorMessage: null
    }));

    try {
      const detail = await fetchConversation(conversationId, token);

      set((state) => ({
        currentView: "chat",
        selectedConversationId: conversationId,
        messages: detail.messages,
        recentChats: state.recentChats.map((chat) => ({
          ...chat,
          active: chat.id === conversationId
        })),
        sidebarItems: setSidebarMode(state.sidebarItems, conversationId),
        errorMessage: null
      }));
    } catch (error) {
      set((state) => ({
        selectedConversationId: null,
        messages: [],
        recentChats: state.recentChats.map((chat) => ({
          ...chat,
          active: false
        })),
        sidebarItems: setSidebarMode(state.sidebarItems, null),
        errorMessage: error instanceof Error ? error.message : "Conversation tidak ditemukan"
      }));
    }
  },
  completeGoogleLogin: async (token) => {
    writeSessionToken(token);
    await get().initializeApp();
  },
  beginGoogleLogin: () => {
    if (typeof window !== "undefined") {
      window.location.href = buildGoogleAuthStartUrl();
    }
  },
  logout: () => {
    clearSessionToken();
    set({
      currentUser: null,
      authStatus: "unauthenticated",
      recentChats: [],
      generatedImages: [],
      messages: [],
      currentView: "chat",
      selectedConversationId: null,
      composerText: "",
      previews: [],
      activeToolIds: [],
      errorMessage: null,
      sidebarItems: setSidebarMode(get().sidebarItems, null)
    });
  },
  activateNavItem: (id) =>
    set((state) => ({
      currentView: id === "images" ? "images" : "chat",
      sidebarItems: setSidebarMode(state.sidebarItems, id === "new-chat" ? null : state.selectedConversationId, id),
      selectedConversationId: id === "new-chat" ? null : state.selectedConversationId,
      messages: id === "new-chat" ? [] : state.messages,
      recentChats:
        id === "new-chat" || id === "images"
          ? state.recentChats.map((chat) => ({
              ...chat,
              active: false
            }))
          : state.recentChats
    })),
  activateRecentChat: async (id) => {
    const token = readSessionToken();

    if (!token) {
      return;
    }

    set((state) => ({
      currentView: "chat",
      selectedConversationId: id,
      recentChats: state.recentChats.map((chat) => ({
        ...chat,
        active: chat.id === id
      })),
      sidebarItems: setSidebarMode(state.sidebarItems, id),
      mobileSidebarOpen: false,
      errorMessage: null
    }));

    const detail = await fetchConversation(id, token);

    set((state) => ({
      currentView: "chat",
      selectedConversationId: id,
      messages: detail.messages,
      recentChats: state.recentChats.map((chat) => ({
        ...chat,
        active: chat.id === id
      })),
      sidebarItems: setSidebarMode(state.sidebarItems, id),
      mobileSidebarOpen: false,
      errorMessage: null
    }));
  },
  renameRecentChat: async (id, title) => {
    const token = readSessionToken();

    if (!token) {
      return false;
    }

    try {
      await renameConversationRequest(id, title, token);
      const { conversations } = await fetchConversations(token);

      set((state) => ({
        recentChats: setRecentChats(conversations, state.selectedConversationId),
        messages:
          state.selectedConversationId === id
            ? state.messages
            : state.messages,
        errorMessage: null
      }));

      return true;
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Gagal mengubah nama conversation"
      });
      return false;
    }
  },
  deleteRecentChat: async (id) => {
    const token = readSessionToken();

    if (!token) {
      return false;
    }

    try {
      await deleteConversationRequest(id, token);
      const { conversations } = await fetchConversations(token);
      const fallbackConversationId =
        get().selectedConversationId === id
          ? (conversations[0]?.id ?? null)
          : get().selectedConversationId;

      let nextMessages: ConversationMessage[] = get().messages;

      if (fallbackConversationId && fallbackConversationId !== get().selectedConversationId) {
        const detail = await fetchConversation(fallbackConversationId, token);
        nextMessages = detail.messages;
      }

      if (fallbackConversationId === null) {
        nextMessages = [];
      }

      set((state) => ({
        selectedConversationId: fallbackConversationId,
        recentChats: setRecentChats(conversations, fallbackConversationId),
        messages: fallbackConversationId === state.selectedConversationId ? state.messages : nextMessages,
        sidebarItems: setSidebarMode(state.sidebarItems, fallbackConversationId),
        errorMessage: null
      }));

      return true;
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Gagal menghapus conversation"
      });
      return false;
    }
  },
  sendMessage: async () => {
    const { composerText, previews, selectedConversationId, selectedModelId, models, activeToolIds } = get();
    const content = composerText.trim();
    const attachmentCount = previews.length;
    const createImageMode = activeToolIds.includes("create-image");

    if (!content && attachmentCount === 0) {
      return false;
    }

    const token = readSessionToken();

    if (!token) {
      get().beginGoogleLogin();
      return false;
    }

    const streamController = new AbortController();
    const localUserId = `local-user-${Date.now()}`;
    const localAssistantId = `local-assistant-${Date.now()}`;
    const now = new Date().toISOString();

    set({
      composerText: "",
      previews: [],
      isSending: true,
      errorMessage: null,
      activeStreamController: streamController
    });

    try {
      const modelLabel =
        models.find((model) => model.id === selectedModelId)?.label ?? selectedModelId;

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: localUserId,
            role: "USER",
            content,
            attachmentCount,
            createdAt: now,
            attachments: previews.map((preview) => ({
              id: preview.id,
              name: preview.name,
              mimeType: preview.mimeType,
              url: preview.src
            }))
          },
          {
            id: localAssistantId,
            role: "ASSISTANT",
            content: "",
            attachmentCount: 0,
            createdAt: now,
            model: createImageMode ? "Xynoos Image" : modelLabel,
            isStreaming: true,
            isImageGeneration: createImageMode,
            toolStates: createImageMode ? [] : []
          }
        ],
        mobileSidebarOpen: false
      }));

      await streamConversationReply(
        {
          conversationId: selectedConversationId,
          content,
          attachmentCount,
          model: selectedModelId,
          toolIds: activeToolIds,
          files: previews.map((preview) => preview.file)
        },
        token,
        {
          onMeta: ({ conversation, userMessageId, assistantMessageId, model, uploadedAttachments }) => {
            const nextModelLabel =
              models.find((item) => item.id === model)?.label ?? modelLabel;

            set((state) => ({
              selectedConversationId: conversation.id,
              messages: state.messages.map((message) => {
                if (message.id === localUserId) {
                  return {
                    ...message,
                    id: userMessageId,
                    attachments:
                      uploadedAttachments?.flatMap((attachment) =>
                        attachment.viewUrl
                          ? [
                              {
                                id: attachment.id,
                                name: attachment.name,
                                mimeType: attachment.mimeType,
                                url: attachment.viewUrl
                              }
                            ]
                          : []
                      ) ?? message.attachments
                  };
                }

                if (message.id === localAssistantId) {
                  return {
                    ...message,
                    id: assistantMessageId,
                    model: createImageMode ? "Xynoos Image" : nextModelLabel,
                    isImageGeneration: createImageMode
                  };
                }

                return message;
              }),
              sidebarItems: setSidebarMode(state.sidebarItems, conversation.id)
            }));
          },
          onDelta: ({ text }) => {
            set((state) => ({
              messages: state.messages.map((message) =>
                message.id === localAssistantId || message.isStreaming
                  ? {
                      ...message,
                      content: `${message.content}${text}`
                    }
                  : message
              )
            }));
          },
          onTool: (tool) => {
            set((state) => ({
              messages: state.messages.map((message) =>
                message.id === localAssistantId || message.isStreaming
                  ? {
                      ...message,
                      toolStates: upsertToolState(message.toolStates, tool)
                    }
                  : message
              )
            }));
          },
          onDone: async ({ conversation, assistantMessageId, content: finalContent, model }) => {
            const { conversations } = await fetchConversations(token);
            const nextModelLabel =
              models.find((item) => item.id === model)?.label ?? modelLabel;

            set((state) => ({
              selectedConversationId: conversation.id,
              recentChats: setRecentChats(conversations, conversation.id),
              sidebarItems: setSidebarMode(state.sidebarItems, conversation.id),
              messages: state.messages.map((message) =>
                message.id === assistantMessageId || message.id === localAssistantId
                  ? {
                      ...message,
                      id: assistantMessageId,
                      content: finalContent,
                      model: nextModelLabel,
                      isStreaming: false,
                      isImageGeneration: createImageMode,
                      toolStates: completeToolStates(message.toolStates)
                    }
                  : message
              ),
              isSending: false,
              activeStreamController: null
            }));

            if (createImageMode) {
              void get().loadGeneratedImages();
            }
          },
          onError: ({ message }) => {
            throw new Error(message);
          }
        },
        {
          signal: streamController.signal
        }
      );
      return true;
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === "AbortError";

      set((state) => ({
        isSending: false,
        activeStreamController: null,
        messages: state.messages
          .map((message) =>
            message.id === localAssistantId || message.isStreaming
              ? {
                  ...message,
                  isStreaming: false,
                  toolStates: completeToolStates(message.toolStates)
                }
              : message
          )
          .filter((message) => !(message.id === localAssistantId && !message.content)),
        errorMessage: isAbortError
          ? null
          : error instanceof Error
            ? error.message
            : "Gagal mengirim pesan"
      }));
      return false;
    }
  },
  stopMessageGeneration: () => {
    const controller = get().activeStreamController;

    if (controller) {
      controller.abort();
    }
  }
}));
