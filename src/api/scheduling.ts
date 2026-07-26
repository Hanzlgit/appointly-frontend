import { apiClient } from "@/lib/api-client";
import { createIdempotencyKey } from "@/lib/utils";
import type { AvailabilityResult, Booking, BookingList } from "@/types/api";

/** 查询指定时间范围内的可用时段。 */
export function schedulingAvailabilityQuery(
  tenantSlug: string,
  params: {
    start: string;
    end: string;
    service_id?: number;
    location_id?: number;
    resource_id?: number;
  },
) {
  const search = new URLSearchParams({
    start: params.start,
    end: params.end,
  });
  if (params.service_id != null) {
    search.set("service_id", String(params.service_id));
  }
  if (params.location_id != null) {
    search.set("location_id", String(params.location_id));
  }
  if (params.resource_id != null) {
    search.set("resource_id", String(params.resource_id));
  }

  return apiClient.get<AvailabilityResult>(
    `/api/v1/${tenantSlug}/scheduling/availability/?${search.toString()}`,
    { auth: false },
  );
}

/** 列出当前客户的预约。 */
export function schedulingBookingList(tenantSlug: string) {
  return apiClient.get<BookingList>(`/api/v1/${tenantSlug}/scheduling/bookings/`);
}

/** 创建预约。 */
export function schedulingBookingCreate(
  tenantSlug: string,
  payload: {
    service_id: number;
    party_size?: number;
    location_id?: number;
    time_slot_id?: number;
    start?: string;
    end?: string;
    resource_id?: number;
    contact_name?: string;
    contact_phone?: string;
  },
) {
  return apiClient.post<Booking>(`/api/v1/${tenantSlug}/scheduling/bookings/`, payload, {
    idempotencyKey: createIdempotencyKey(),
  });
}

/** 取消预约。 */
export function schedulingBookingCancel(
  tenantSlug: string,
  bookingId: number,
  reason = "",
) {
  return apiClient.post<Booking>(
    `/api/v1/${tenantSlug}/scheduling/bookings/${bookingId}/cancel/`,
    { reason },
  );
}
