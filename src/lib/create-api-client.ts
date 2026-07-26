import type { ApiEnvelope, ApiError, AuthTokens } from "@/types/api";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
};

export interface AuthStorageAdapter {
  load: () => AuthTokens | null;
  save: (tokens: AuthTokens) => void;
  clear: () => void;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/** 创建带独立 token 存储的 API 客户端。 */
export function createApiClient(authStorage: AuthStorageAdapter) {
  let refreshPromise: Promise<AuthTokens | null> | null = null;

  function apiUrl(path: string): string {
    return `${API_BASE_URL}${path}`;
  }

  async function refreshAccessToken(): Promise<AuthTokens | null> {
    const tokens = authStorage.load();
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
      authStorage.clear();
      return null;
    }

    authStorage.save(envelope.data);
    return envelope.data;
  }

  function refreshAccessTokenOnce(): Promise<AuthTokens | null> {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

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
      const tokens = authStorage.load();
      if (tokens?.access) {
        headers.set("Authorization", `Bearer ${tokens.access}`);
      }
    }

    const response = await fetch(apiUrl(path), {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    let envelope: ApiEnvelope<T>;
    try {
      envelope = (await response.json()) as ApiEnvelope<T>;
    } catch {
      const error = new Error(
        response.status >= 502
          ? "无法连接后端服务，请确认 Django 已启动。"
          : "服务器响应异常",
      ) as ApiError;
      error.status = response.status;
      error.code = -1;
      error.data = null;
      throw error;
    }

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

  return {
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
    patch<T>(
      path: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return apiFetch<T>(path, { ...options, method: "PATCH", body });
    },
    delete(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
      return apiFetch<void>(path, { ...options, method: "DELETE" });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
