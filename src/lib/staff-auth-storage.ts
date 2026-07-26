import type { AuthTokens } from "@/types/api";

const STAFF_AUTH_STORAGE_KEY = "appointly.auth.staff.tokens";

/** 从 localStorage 读取员工 JWT。 */
export function staffAuthTokensLoad(): AuthTokens | null {
  const raw = localStorage.getItem(STAFF_AUTH_STORAGE_KEY);
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

/** 持久化员工 JWT。 */
export function staffAuthTokensSave(tokens: AuthTokens): void {
  localStorage.setItem(STAFF_AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

/** 清除员工 JWT。 */
export function staffAuthTokensClear(): void {
  localStorage.removeItem(STAFF_AUTH_STORAGE_KEY);
}

/** 判断员工是否已登录。 */
export function staffAuthIsLoggedIn(): boolean {
  return staffAuthTokensLoad()?.access != null;
}
