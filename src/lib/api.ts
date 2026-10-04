import { API_BASE } from "./config";

// ---------------------------------------------------------------------------
// Types (mirror the Menmo backend responses)
// ---------------------------------------------------------------------------

export type Source = "document" | "web" | "llm" | "memory" | "chat" | string;

export interface Chunk {
  id: string | null;
  text: string;
  score?: number;
  similarity?: number;
  meta?: {
    title?: string;
    source?: string; // URL for web results
    type?: string;
    page_num?: number;
    section_title?: string;
    document_id?: string;
    domain?: string;
  };
}

export interface ChatResponse {
  answer: string;
  source: Source;
  intent?: string;
  tone?: string;
  verbosity?: string;
  confidence: number;
  chunks: Chunk[];
  trace?: Record<string, unknown>[];
  query_id: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  filename: string;
  domain: string;
  created_at: string;
}

export type DocumentsByDomain = Record<string, DocumentInfo[]>;

export interface UploadResult {
  document_id: string;
  chunks_indexed: number;
  domain: string;
  title: string;
}

export interface Analytics {
  total_queries: number;
  queries_today: number;
  avg_score: number;
  positive_feedback: number;
  negative_feedback: number;
  top_queries: { query: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const ACCESS = "mnemo.access";
const REFRESH = "mnemo.refresh";
const USER = "mnemo.user";
export const LOGOUT_EVENT = "mnemo:logout";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — session lasts until reload */
  }
}

export const tokens = {
  get access() {
    return read(ACCESS);
  },
  get refresh() {
    return read(REFRESH);
  },
  get user() {
    return read(USER);
  },
  set(access: string, refresh: string | null, user?: string) {
    write(ACCESS, access);
    if (refresh !== null) write(REFRESH, refresh);
    if (user !== undefined) write(USER, user);
  },
  clear() {
    [ACCESS, REFRESH, USER].forEach((k) => write(k, null));
  },
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Turn DRF error bodies ({detail} or {field: [msgs]}) into one readable line. */
function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string") return b.detail;
    const parts = Object.entries(b).map(([field, v]) => {
      const msg = Array.isArray(v) ? v.join(" ") : String(v);
      return field === "non_field_errors" ? msg : `${field}: ${msg}`;
    });
    if (parts.length) return parts.join(" · ");
  }
  if (status === 429) return "Too many requests — please wait a moment.";
  if (status >= 500) return "The server had a problem. Please try again.";
  return `Request failed (${status}).`;
}

const NETWORK_MESSAGE =
  "Can't reach the Menmo server. If it was idle it may be waking up — try again in a minute.";

// ---------------------------------------------------------------------------
// Core request with one transparent token refresh
// ---------------------------------------------------------------------------

let refreshing: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      tokens.set(data.access, data.refresh ?? null);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function forceLogout() {
  tokens.clear();
  window.dispatchEvent(new Event(LOGOUT_EVENT));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, timeoutMs = 120_000 } = opts;

  const send = async () => {
    const headers: Record<string, string> = {};
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    const access = tokens.access;
    if (auth && access) headers.Authorization = `Bearer ${access}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch {
      if (ctrl.signal.aborted) throw new ApiError("The server took too long to answer. Please try again.", 0);
      throw new ApiError(NETWORK_MESSAGE, 0);
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await send();
  if (res.status === 401 && auth) {
    if (await refreshAccess()) {
      res = await send();
    }
    if (res.status === 401) {
      forceLogout();
      throw new ApiError("Your session expired. Please log in again.", 401);
    }
  }

  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // Non-JSON (e.g. the Space's "starting up" page)
    if (!res.ok) throw new ApiError(res.status === 503 ? NETWORK_MESSAGE : messageFrom(null, res.status), res.status);
  }
  if (!res.ok) throw new ApiError(messageFrom(data, res.status), res.status);
  return data as T;
}

/** Upload with progress events (fetch can't report upload progress). */
export function uploadWithProgress(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<UploadResult> {
  const attempt = (): Promise<{ status: number; body: unknown }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/upload-document/`);
      const access = tokens.access;
      if (access) xhr.setRequestHeader("Authorization", `Bearer ${access}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(xhr.responseText);
        } catch {
          parsed = undefined;
        }
        resolve({ status: xhr.status, body: parsed });
      };
      xhr.onerror = () => reject(new ApiError(NETWORK_MESSAGE, 0));
      const form = new FormData();
      form.append("file", file);
      xhr.send(form);
    });

  return (async () => {
    let { status, body } = await attempt();
    if (status === 401 && (await refreshAccess())) ({ status, body } = await attempt());
    if (status === 401) {
      forceLogout();
      throw new ApiError("Your session expired. Please log in again.", 401);
    }
    if (status < 200 || status >= 300) throw new ApiError(messageFrom(body, status), status);
    return body as UploadResult;
  })();
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const api = {
  login: (username: string, password: string) =>
    request<{ access: string; refresh: string }>("/auth/login/", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),
  signup: (username: string, email: string, password: string) =>
    request<{ detail: string }>("/auth/signup/", {
      method: "POST",
      body: { username, email, password },
      auth: false,
    }),
  changePassword: (old_password: string, new_password: string) =>
    request<{ detail: string }>("/auth/reset-password/", {
      method: "POST",
      body: { old_password, new_password },
    }),

  listConversations: () => request<Conversation[]>("/api/conversations/list/"),
  createConversation: () => request<{ id: string }>("/api/conversations/", { method: "POST" }),
  history: (id: string) => request<HistoryMessage[]>(`/api/conversations/${id}/history/`),
  chat: (id: string, body: { query: string; document_id?: string; domain?: string; mood?: string }) =>
    request<ChatResponse>(`/api/conversations/${id}/chat/`, { method: "POST", body, timeoutMs: 180_000 }),
  renameConversation: (id: string, title: string) =>
    request<{ title: string }>(`/api/conversations/${id}/rename/`, { method: "PATCH", body: { title } }),
  deleteConversation: (id: string) => request(`/api/conversations/${id}/delete/`, { method: "DELETE" }),

  documents: () => request<DocumentsByDomain>("/api/my-documents/"),
  deleteDocument: (id: string) => request(`/api/delete-document/${id}/`, { method: "DELETE" }),

  feedback: (query_id: string, value: "up" | "down") =>
    request("/api/feedback/", { method: "POST", body: { query_id, value, reason: "" } }),
  analytics: () => request<Analytics>("/api/analytics/"),
};
