import { apiClient } from "@/lib/api-client";
import type { QueueTicket } from "@/types/api";

/** 获取当前用户的有效排队号。 */
export function queueTicketMine() {
  return apiClient.get<QueueTicket | null>("/api/v1/queue/tickets/");
}

/** 取号。 */
export function queueTicketCreate(payload: {
  stylist_id: number;
  service_id: number;
  idempotency_key: string;
}) {
  return apiClient.post<QueueTicket>("/api/v1/queue/tickets/", payload, {
    idempotencyKey: payload.idempotency_key,
  });
}

/** 获取排队号详情。 */
export function queueTicketGet(ticketId: number) {
  return apiClient.get<QueueTicket>(`/api/v1/queue/tickets/${ticketId}/`);
}

/** 取消排队。 */
export function queueTicketCancel(ticketId: number, reason = "") {
  return apiClient.post<QueueTicket>(`/api/v1/queue/tickets/${ticketId}/cancel/`, { reason });
}
