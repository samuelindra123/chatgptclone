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

export type TheologySessionSummary = {
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
  toolStates?: ToolState[];
  attachments?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
  }>;
};

export type ToolState = {
  id: "current_datetime" | "web_search_duckduckgo";
  status: "running" | "completed";
  detail: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
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

export type TheologySessionDetail = {
  session: {
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
  onTool?: (payload: ToolState) => void;
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

type TheologyStreamPayload = {
  sessionId?: string | null;
  content: string;
  model?: string;
  deepAcademicMode?: boolean;
};

type TheologyStreamEventHandlers = {
  onMeta?: (payload: {
    session: TheologySessionDetail["session"];
    userMessageId: string;
    assistantMessageId: string;
    model: string;
  }) => void;
  onDelta?: (payload: { text: string }) => void;
  onTool?: (payload: ToolState) => void;
  onDone?: (payload: {
    session: TheologySessionDetail["session"];
    assistantMessageId: string;
    content: string;
    model: string;
  }) => void;
  onError?: (payload: { message: string }) => void;
};

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!apiUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_URL environment variable");
  }

  return apiUrl.replace(/\/+$/, "");
}
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorPayload?.message ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function buildGoogleAuthStartUrl() {
  if (typeof window === "undefined") {
    throw new Error("Google auth URL can only be built in the browser");
  }

  const url = new URL(`${getApiBaseUrl()}/auth/google/start`, window.location.origin);
  url.searchParams.set("redirectTo", window.location.origin);

  return url.toString();
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: AuthUser | null }>("/auth/me");
}

export async function logoutSession() {
  return apiFetch<{ success: boolean }>("/auth/logout", {
    method: "POST"
  });
}

export async function fetchConversations() {
  return apiFetch<{ conversations: ConversationSummary[] }>("/conversations");
}

export async function fetchConversation(conversationId: string) {
  return apiFetch<ConversationDetail>(`/conversations/${conversationId}`);
}

export async function fetchTheologySessions() {
  return apiFetch<{ sessions: TheologySessionSummary[] }>("/teologis-ai/sessions");
}

export async function fetchTheologySession(sessionId: string) {
  return apiFetch<TheologySessionDetail>(`/teologis-ai/sessions/${sessionId}`);
}

export async function renameTheologySession(sessionId: string, title: string) {
  return apiFetch<{ session: TheologySessionDetail["session"] }>(`/teologis-ai/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  });
}

export async function deleteTheologySession(sessionId: string) {
  return apiFetch<{ success: boolean }>(`/teologis-ai/sessions/${sessionId}`, {
    method: "DELETE"
  });
}

export async function fetchGeneratedImages() {
  return apiFetch<{ images: GeneratedImageItem[] }>("/conversations/generated-images");
}

export async function createConversation(payload: MutationPayload) {
  return apiFetch<ConversationDetail>("/conversations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function appendConversationMessage(
  conversationId: string,
  payload: MutationPayload
) {
  return apiFetch<ConversationDetail>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function streamConversationReply(
  payload: MutationPayload,
  handlers: StreamEventHandlers,
  options: StreamOptions = {}
) {
  const headers = new Headers();

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
    credentials: "include",
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

      if (parsed.event === "tool") {
        handlers.onTool?.(payload as ToolState);
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

export async function streamTheologyReply(
  payload: TheologyStreamPayload,
  handlers: TheologyStreamEventHandlers,
  options: StreamOptions = {}
) {
  const response = await fetch(`${getApiBaseUrl()}/teologis-ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "include",
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

      const eventPayload = JSON.parse(parsed.data) as Record<string, unknown>;

      if (parsed.event === "meta") {
        handlers.onMeta?.(eventPayload as Parameters<NonNullable<TheologyStreamEventHandlers["onMeta"]>>[0]);
        continue;
      }

      if (parsed.event === "delta") {
        handlers.onDelta?.(eventPayload as Parameters<NonNullable<TheologyStreamEventHandlers["onDelta"]>>[0]);
        continue;
      }

      if (parsed.event === "tool") {
        handlers.onTool?.(eventPayload as ToolState);
        continue;
      }

      if (parsed.event === "done") {
        handlers.onDone?.(eventPayload as Parameters<NonNullable<TheologyStreamEventHandlers["onDone"]>>[0]);
        continue;
      }

      if (parsed.event === "error") {
        handlers.onError?.(eventPayload as Parameters<NonNullable<TheologyStreamEventHandlers["onError"]>>[0]);
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
  title: string
) {
  return apiFetch<{ conversation: ConversationDetail["conversation"] }>(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  });
}

export async function deleteConversation(conversationId: string) {
  return apiFetch<{ success: boolean }>(`/conversations/${conversationId}`, {
    method: "DELETE"
  });
}
