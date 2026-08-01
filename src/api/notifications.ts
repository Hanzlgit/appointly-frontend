import { apiClient } from "@/lib/api-client";
import type { Notification, NotificationListResult, NotificationReadAllResult } from "@/types/api";

export interface NotificationListParams {
  page?: number;
  page_size?: number;
  q?: string;
  unread_only?: boolean;
  type?: string;
}

/** 分页列出当前客户的站内通知。 */
export function notificationList(tenantSlug: string, params: NotificationListParams = {}) {
  const search = new URLSearchParams();
  if (params.page != null) {
    search.set("page", String(params.page));
  }
  if (params.page_size != null) {
    search.set("page_size", String(params.page_size));
  }
  if (params.q) {
    search.set("q", params.q);
  }
  if (params.unread_only) {
    search.set("unread_only", "true");
  }
  if (params.type) {
    search.set("type", params.type);
  }

  const query = search.toString();
  const suffix = query ? `?${query}` : "";
  return apiClient.get<NotificationListResult>(
    `/api/v1/${tenantSlug}/notifications/${suffix}`,
  );
}

/** 将单条通知标记为已读。 */
export function notificationMarkRead(tenantSlug: string, notificationId: number) {
  return apiClient.patch<Notification>(
    `/api/v1/${tenantSlug}/notifications/${notificationId}/read/`,
  );
}

/** 将全部通知标记为已读。 */
export function notificationReadAll(tenantSlug: string) {
  return apiClient.post<NotificationReadAllResult>(
    `/api/v1/${tenantSlug}/notifications/read-all/`,
  );
}
