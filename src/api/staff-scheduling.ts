import { staffApiClient } from "@/lib/staff-api-client";
import type { ScheduleRule, ScheduleRuleCreatePayload, ScheduleRuleList } from "@/types/staff-api";

/** 列出排班规则，可按资源过滤（Admin）。 */
export function staffScheduleRuleList(tenantSlug: string, resourceId?: number) {
  const suffix = resourceId !== undefined ? `?resource_id=${resourceId}` : "";
  return staffApiClient.get<ScheduleRuleList>(`/api/v1/${tenantSlug}/scheduling/rules/${suffix}`);
}

/** 创建排班规则（Admin）。 */
export function staffScheduleRuleCreate(tenantSlug: string, payload: ScheduleRuleCreatePayload) {
  return staffApiClient.post<ScheduleRule>(`/api/v1/${tenantSlug}/scheduling/rules/`, payload);
}
