const DEFAULT_API_URL = "http://localhost:3001/api";
const SESSION_TOKEN_KEY = "xynoos.session-token";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
};

export type ConversationMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  attachmentCount: number;
  createdAt: string;
  model?: string | null;
  isStreaming?: boolean;
  isImageGeneration?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
  }>;
};

export type ConversationDetail = {
  conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: ConversationMessage[];
};

export type GeneratedImageItem = {
  id: string;
  conversationId: string;
  conversationTitle: string;
  imageUrl: string;
  prompt: string | null;
  model: string | null;
  createdAt: string;
};

type MutationPayload = {
  conversationId?: string | null;
  content: string;
  attachmentCount: number;
  model?: string;
  toolIds?: string[];
  files?: File[];
};

type StreamEventHandlers = {
  onMeta?: (payload: {
    conversation: ConversationDetail["conversation"];
    userMessageId: string;
    assistantMessageId: string;
    model: string;
    uploadedAttachments?: Array<{
      id: string;
      name: string;
      mimeType: string;
      viewUrl: string | null;
    }>;
  }) => void;
  onDelta?: (payload: { text: string }) => void;
  onDone?: (payload: {
    conversation: ConversationDetail["conversation"];
    assistantMessageId: string;
    content: string;
    model: string;
  }) => void;
  onError?: (payload: { message: string }) => void;
};

type StreamOptions = {
  signal?: AbortSignal;
};

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorPayload?.message ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getSessionTokenKey() {
  return SESSION_TOKEN_KEY;
}

export function readSessionToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function writeSessionToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

export function clearSessionToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

export function buildGoogleAuthStartUrl() {
  const url = new URL(`${getApiBaseUrl()}/auth/google/start`);

  if (typeof window !== "undefined") {
    url.searchParams.set("redirectTo", window.location.origin);
  }

  return url.toString();
}

export async function fetchCurrentUser(token: string) {
  return apiFetch<{ user: AuthUser }>("/auth/me", {}, token);
}

export async function fetchConversations(token: string) {
  return apiFetch<{ conversations: ConversationSummary[] }>("/conversations", {}, token);
}

export async function fetchConversation(conversationId: string, token: string) {
  return apiFetch<ConversationDetail>(`/conversations/${conversationId}`, {}, token);
}

export async function fetchGeneratedImages(token: string) {
  return apiFetch<{ images: GeneratedImageItem[] }>("/conversations/generated-images", {}, token);
}

export async function createConversation(payload: MutationPayload, token: string) {
  return apiFetch<ConversationDetail>("/conversations", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export async function appendConversationMessage(
  conversationId: string,
  payload: MutationPayload,
  token: string
) {
  return apiFetch<ConversationDetail>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export async function streamConversationReply(
  payload: MutationPayload,
  token: string,
  handlers: StreamEventHandlers,
  options: StreamOptions = {}
) {
  const headers = new Headers({
    Authorization: `Bearer ${token}`
  });

  let body: BodyInit;

  if (payload.files && payload.files.length > 0) {
    const formData = new FormData();

    if (payload.conversationId) {
      formData.append("conversationId", payload.conversationId);
    }

    formData.append("content", payload.content);
    formData.append("attachmentCount", String(payload.attachmentCount));

    if (payload.model) {
      formData.append("model", payload.model);
    }

    payload.toolIds?.forEach((toolId) => {
      formData.append("toolIds", toolId);
    });

    payload.files.forEach((file) => {
      formData.append("files", file);
    });

    body = formData;
  } else {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(payload);
  }

  const response = await fetch(`${getApiBaseUrl()}/conversations/stream`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: options.signal
  });

  if (!response.ok || !response.body) {
    const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorPayload?.message ?? `Request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const parsed = parseSseBlock(block);

      if (!parsed) {
        continue;
      }

      const payload = JSON.parse(parsed.data) as Record<string, unknown>;

      if (parsed.event === "meta") {
        handlers.onMeta?.(payload as Parameters<NonNullable<StreamEventHandlers["onMeta"]>>[0]);
        continue;
      }

      if (parsed.event === "delta") {
        handlers.onDelta?.(payload as Parameters<NonNullable<StreamEventHandlers["onDelta"]>>[0]);
        continue;
      }

      if (parsed.event === "done") {
        handlers.onDone?.(payload as Parameters<NonNullable<StreamEventHandlers["onDone"]>>[0]);
        continue;
      }

      if (parsed.event === "error") {
        handlers.onError?.(payload as Parameters<NonNullable<StreamEventHandlers["onError"]>>[0]);
      }
    }
  }
}

function parseSseBlock(block: string) {
  const lines = block.split("\n");
  const event = lines.find((line) => line.startsWith("event:"))?.slice("event:".length).trim();
  const dataLines = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  if (!event || dataLines.length === 0) {
    return null;
  }

  return {
    event,
    data: dataLines.join("\n")
  };
}

export async function renameConversation(
  conversationId: string,
  title: string,
  token: string
) {
  return apiFetch<{ conversation: ConversationDetail["conversation"] }>(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  }, token);
}

export async function deleteConversation(conversationId: string, token: string) {
  return apiFetch<{ success: boolean }>(`/conversations/${conversationId}`, {
    method: "DELETE"
  }, token);
}
