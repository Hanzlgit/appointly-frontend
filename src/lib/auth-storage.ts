import type { AuthTokens } from "@/types/api";

const AUTH_STORAGE_KEY = "appointly.auth.tokens";

/** 从 localStorage 读取已保存的 JWT。 */
export function authTokensLoad(): AuthTokens | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthTokens;
    if (!parsed.access || !parsed.refresh) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 将 JWT 持久化到 localStorage。 */
export function authTokensSave(tokens: AuthTokens): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

/** 清除本地 JWT。 */
export function authTokensClear(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/** 判断是否已登录（存在 access token）。 */
export function authIsLoggedIn(): boolean {
  return authTokensLoad()?.access != null;
}
