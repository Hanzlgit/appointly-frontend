import { staffApiClient } from "@/lib/staff-api-client";
import type { DashboardSummary } from "@/types/staff-api";

/** 获取经营看板汇总（Admin）。 */
export function staffDashboardSummaryRetrieve(tenantSlug: string, params?: { date?: string }) {
  const search = new URLSearchParams();
  if (params?.date) {
    search.set("date", params.date);
  }
  const query = search.toString();
  return staffApiClient.get<DashboardSummary>(
    `/api/v1/${tenantSlug}/dashboard/summary${query ? `?${query}` : ""}`,
  );
}
