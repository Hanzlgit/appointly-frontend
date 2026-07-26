import { createContext, useContext } from "react";

import type { TenantRole } from "@/types/staff-api";

export interface ConsoleSession {
  tenantSlug: string;
  role: TenantRole;
}

const ConsoleSessionContext = createContext<ConsoleSession | null>(null);

export const ConsoleSessionProvider = ConsoleSessionContext.Provider;

/** 读取当前控制台会话（租户 + 角色）。 */
export function useConsoleSession(): ConsoleSession {
  const session = useContext(ConsoleSessionContext);
  if (!session) {
    throw new Error("useConsoleSession 必须在 ConsoleSessionProvider 内使用");
  }
  return session;
}

/** 尝试读取控制台会话，未登录时返回 null。 */
export function useConsoleSessionOptional(): ConsoleSession | null {
  return useContext(ConsoleSessionContext);
}
