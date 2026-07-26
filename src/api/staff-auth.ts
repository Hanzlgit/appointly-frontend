import { staffApiClient } from "@/lib/staff-api-client";
import { staffAuthTokensSave } from "@/lib/staff-auth-storage";
import type { AuthTokens } from "@/types/api";
import type { TenantMembership } from "@/types/staff-api";

/** 员工账号密码登录。 */
export function staffAuthCreateSession(payload: { login: string; password: string }) {
  return staffApiClient
    .post<AuthTokens>("/api/v1/auth/staff/sessions/", payload, { auth: false })
    .then((tokens) => {
      staffAuthTokensSave(tokens);
      return tokens;
    });
}

/** 获取当前用户在租户下的成员角色。 */
export function staffTenantMembershipRetrieve(tenantSlug: string) {
  return staffApiClient.get<TenantMembership>(`/api/v1/${tenantSlug}/membership/`);
}
