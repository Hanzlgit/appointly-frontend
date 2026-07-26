import { authTokensClear, authTokensLoad, authTokensSave } from "@/lib/auth-storage";
import type { ApiEnvelope, ApiError, AuthTokens } from "@/types/api";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

let refreshPromise: Promise<AuthTokens | null> | null = null;

/** 拼接 API 完整路径。 */
function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** 调用 refresh token 接口并更新本地存储。 */
async function refreshAccessToken(): Promise<AuthTokens | null> {
  const tokens = authTokensLoad();
  if (!tokens?.refresh) {
    return null;
  }

  const response = await fetch(apiUrl("/api/v1/auth/tokens/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });

  const envelope = (await response.json()) as ApiEnvelope<AuthTokens>;
  if (!response.ok || envelope.code !== 0) {
    authTokensClear();
    return null;
  }

  authTokensSave(envelope.data);
  return envelope.data;
}

/** 并发 401 时复用同一次 refresh，避免重复请求。 */
function refreshAccessTokenOnce(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** 构造带鉴权与 JSON 头的 fetch 请求。 */
async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  if (options.auth !== false) {
    const tokens = authTokensLoad();
    if (tokens?.access) {
      headers.set("Authorization", `Bearer ${tokens.access}`);
    }
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (response.status === 401 && options.auth !== false) {
    const refreshed = await refreshAccessTokenOnce();
    if (refreshed) {
      return apiFetch<T>(path, options);
    }
  }

  if (!response.ok || envelope.code !== 0) {
    const error = new Error(envelope.message || "请求失败") as ApiError;
    error.status = response.status;
    error.code = envelope.code;
    error.data = envelope.data;
    throw error;
  }

  return envelope.data;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return apiFetch<T>(path, { ...options, method: "GET" });
  },
  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return apiFetch<T>(path, { ...options, method: "POST", body });
  },
};
