import { apiClient } from "@/lib/api-client";
import type { CatalogPublicBrowse, CustomerProfile, TenantContext } from "@/types/api";

/** 获取租户公开信息（无需登录）。 */
export function tenantContextRetrieve(tenantSlug: string) {
  return apiClient.get<TenantContext>(`/api/v1/${tenantSlug}/context/`, { auth: false });
}

/** 浏览租户公开目录（地点与服务）。 */
export function catalogPublicBrowse(tenantSlug: string) {
  return apiClient.get<CatalogPublicBrowse>(`/api/v1/${tenantSlug}/catalog/public/`, {
    auth: false,
  });
}

/** 获取当前客户在租户下的档案。 */
export function tenantCustomerMeRetrieve(tenantSlug: string) {
  return apiClient.get<CustomerProfile>(`/api/v1/${tenantSlug}/customers/me/`);
}
