import { apiClient } from "@/lib/api-client";
import type { AuthTokens } from "@/types/api";

/** 向手机号发送登录验证码。 */
export function authSendVerificationCode(phone: string) {
  return apiClient.post<null>(
    "/api/v1/auth/customer/verification-codes/",
    { phone },
    { auth: false },
  );
}

/** 验证码登录并返回 JWT。 */
export function authCreateCustomerSession(payload: {
  phone: string;
  code: string;
  tenant_slug: string;
}) {
  return apiClient.post<AuthTokens>("/api/v1/auth/customer/sessions/", payload, {
    auth: false,
  });
}
