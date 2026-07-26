import { staffApiClient } from "@/lib/staff-api-client";
import type { DashboardSummary } from "@/types/staff-api";

/** 获取经营看板汇总（Admin）。 */
export function staffDashboardSummaryRetrieve(
  tenantSlug: string,
  params?: { date?: string; locationId?: number },
) {
  const search = new URLSearchParams();
  if (params?.date) {
    search.set("date", params.date);
  }
  if (params?.locationId != null) {
    search.set("location_id", String(params.locationId));
  }
  const query = search.toString();
  return staffApiClient.get<DashboardSummary>(
    `/api/v1/${tenantSlug}/dashboard/summary${query ? `?${query}` : ""}`,
  );
}
