"use client";

import { create } from "zustand";
import {
  buildGoogleAuthStartUrl,
  deleteTheologySession,
  fetchCurrentUser,
  fetchTheologySession,
  fetchTheologySessions,
  renameTheologySession,
  streamTheologyReply,
  type AuthUser,
  type ConversationMessage,
  type TheologySessionSummary,
  type ToolState
} from "@/lib/api";

type TheologyUiState = {
  sessions: TheologySessionSummary[];
  messages: ConversationMessage[];
  selectedSessionId: string | null;
  composerText: string;
  deepAcademicMode: boolean;
  isSending: boolean;
  initializing: boolean;
  authStatus: "idle" | "loading" | "authenticated" | "unauthenticated";
  currentUser: AuthUser | null;
  errorMessage: string | null;
  activeStreamController: AbortController | null;
  initialize: () => Promise<void>;
  setComposerText: (value: string) => void;
  toggleDeepAcademicMode: () => void;
  activateSession: (id: string | null) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;
  sendMessage: () => Promise<boolean>;
  stopMessageGeneration: () => void;
  beginGoogleLogin: () => void;
};

function setActiveSession(
  sessions: TheologySessionSummary[],
  selectedSessionId: string | null
) {
  return sessions.map((session) => ({
    ...session,
    active: session.id === selectedSessionId
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

export const useTheologyUiStore = create<TheologyUiState>((set, get) => ({
  sessions: [],
  messages: [],
  selectedSessionId: null,
  composerText: "",
  deepAcademicMode: true,
  isSending: false,
  initializing: true,
  authStatus: "idle",
  currentUser: null,
  errorMessage: null,
  activeStreamController: null,
  initialize: async () => {
    set({
      initializing: true,
      authStatus: "loading",
      errorMessage: null
    });

    try {
      const { user } = await fetchCurrentUser();

      if (!user) {
        set({
          currentUser: null,
          authStatus: "unauthenticated",
          sessions: [],
          messages: [],
          selectedSessionId: null,
          initializing: false,
          errorMessage: null
        });
        return;
      }

      const { sessions } = await fetchTheologySessions();
      const selectedSessionId = sessions[0]?.id ?? null;

      set({
        currentUser: user,
        authStatus: "authenticated",
        sessions: setActiveSession(sessions, selectedSessionId),
        selectedSessionId,
        initializing: false,
        errorMessage: null
      });

      if (selectedSessionId) {
        const detail = await fetchTheologySession(selectedSessionId);
        set({
          messages: detail.messages
        });
      } else {
        set({
          messages: []
        });
      }
    } catch (error) {
      set({
        currentUser: null,
        authStatus: "unauthenticated",
        sessions: [],
        messages: [],
        selectedSessionId: null,
        initializing: false,
        errorMessage: error instanceof Error ? error.message : "Gagal memuat Teologis AI"
      });
    }
  },
  setComposerText: (value) => set({ composerText: value }),
  toggleDeepAcademicMode: () =>
    set((state) => ({
      deepAcademicMode: !state.deepAcademicMode
    })),
  activateSession: async (id) => {
    if (get().authStatus !== "authenticated") {
      return;
    }

    if (id === null) {
      set((state) => ({
        selectedSessionId: null,
        messages: [],
        sessions: setActiveSession(state.sessions, null),
        errorMessage: null
      }));
      return;
    }

    set((state) => ({
      selectedSessionId: id,
      sessions: setActiveSession(state.sessions, id),
      errorMessage: null
    }));

    try {
      const detail = await fetchTheologySession(id);
      set({
        messages: detail.messages,
        errorMessage: null
      });
    } catch (error) {
      set((state) => ({
        selectedSessionId: null,
        sessions: setActiveSession(state.sessions, null),
        messages: [],
        errorMessage: error instanceof Error ? error.message : "Sesi teologi tidak ditemukan"
      }));
    }
  },
  renameSession: async (id, title) => {
    if (get().authStatus !== "authenticated") {
      return false;
    }

    try {
      await renameTheologySession(id, title);
      const { sessions } = await fetchTheologySessions();
      set((state) => ({
        sessions: setActiveSession(sessions, state.selectedSessionId),
        errorMessage: null
      }));
      return true;
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Gagal mengubah nama sesi"
      });
      return false;
    }
  },
  deleteSession: async (id) => {
    if (get().authStatus !== "authenticated") {
      return false;
    }

    try {
      await deleteTheologySession(id);
      const { sessions } = await fetchTheologySessions();
      const nextSessionId = 
        get().selectedSessionId === id 
          ? (sessions[0]?.id ?? null) 
          : get().selectedSessionId;
      
      let nextMessages = get().messages;
      if (nextSessionId !== get().selectedSessionId) {
        if (nextSessionId) {
          const detail = await fetchTheologySession(nextSessionId);
          nextMessages = detail.messages;
        } else {
          nextMessages = [];
        }
      }

      set((state) => ({
        selectedSessionId: nextSessionId,
        sessions: setActiveSession(sessions, nextSessionId),
        messages: nextMessages,
        errorMessage: null
      }));
      return true;
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Gagal menghapus sesi"
      });
      return false;
    }
  },
  sendMessage: async () => {
    const { composerText, selectedSessionId, deepAcademicMode, authStatus } = get();
    const content = composerText.trim();

    if (!content) {
      return false;
    }

    if (authStatus !== "authenticated") {
      get().beginGoogleLogin();
      return false;
    }

    const streamController = new AbortController();
    const localUserId = `local-theology-user-${Date.now()}`;
    const localAssistantId = `local-theology-assistant-${Date.now()}`;
    const now = new Date().toISOString();

    set({
      composerText: "",
      isSending: true,
      errorMessage: null,
      activeStreamController: streamController,
      messages: [
        ...get().messages,
        {
          id: localUserId,
          role: "USER",
          content,
          attachmentCount: 0,
          createdAt: now
        },
        {
          id: localAssistantId,
          role: "ASSISTANT",
          content: "",
          attachmentCount: 0,
          createdAt: now,
          model: "Teologis AI",
          isStreaming: true,
          toolStates: []
        }
      ]
    });

    try {
      await streamTheologyReply(
        {
          sessionId: selectedSessionId,
          content,
          model: "xynoos-ai-v1",
          deepAcademicMode
        },
        {
          onMeta: ({ session, userMessageId, assistantMessageId }) => {
            set((state) => ({
              selectedSessionId: session.id,
              sessions: setActiveSession(state.sessions, session.id),
              messages: state.messages.map((message) => {
                if (message.id === localUserId) {
                  return {
                    ...message,
                    id: userMessageId
                  };
                }

                if (message.id === localAssistantId) {
                  return {
                    ...message,
                    id: assistantMessageId,
                    model: "Teologis AI"
                  };
                }

                return message;
              })
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
          onDone: async ({ session, assistantMessageId, content: finalContent }) => {
            const { sessions } = await fetchTheologySessions();

            set((state) => ({
              selectedSessionId: session.id,
              sessions: setActiveSession(sessions, session.id),
              messages: state.messages.map((message) =>
                message.id === assistantMessageId || message.id === localAssistantId
                  ? {
                      ...message,
                      id: assistantMessageId,
                      content: finalContent,
                      model: "Teologis AI",
                      isStreaming: false,
                      toolStates: completeToolStates(message.toolStates)
                    }
                  : message
              ),
              isSending: false,
              activeStreamController: null
            }));
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
                  isStreaming: false
                }
              : message
          )
          .filter((message) => !(message.id === localAssistantId && !message.content)),
        errorMessage: isAbortError
          ? null
          : error instanceof Error
            ? error.message
            : "Gagal mengirim pesan Teologis AI"
      }));

      return false;
    }
  },
  stopMessageGeneration: () => {
    const controller = get().activeStreamController;

    if (controller) {
      controller.abort();
    }
  },
  beginGoogleLogin: () => {
    if (typeof window !== "undefined") {
      window.location.href = buildGoogleAuthStartUrl();
    }
  }
}));
