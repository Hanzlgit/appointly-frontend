import { staffApiClient } from "@/lib/staff-api-client";
import type { StaffBooking, StaffBookingList } from "@/types/staff-api";

/** 列出后台可见预约。 */
export function staffBookingList(tenantSlug: string) {
  return staffApiClient.get<StaffBookingList>(`/api/v1/${tenantSlug}/scheduling/staff/bookings/`);
}

/** 确认待处理预约（Admin）。 */
export function staffBookingConfirm(tenantSlug: string, bookingId: number) {
  return staffApiClient.post<StaffBooking>(
    `/api/v1/${tenantSlug}/scheduling/bookings/${bookingId}/confirm/`,
  );
}

/** 拒绝待处理预约（Admin）。 */
export function staffBookingReject(tenantSlug: string, bookingId: number) {
  return staffApiClient.post<StaffBooking>(
    `/api/v1/${tenantSlug}/scheduling/bookings/${bookingId}/reject/`,
  );
}

/** 标记预约已完成（Admin）。 */
export function staffBookingComplete(tenantSlug: string, bookingId: number) {
  return staffApiClient.post<StaffBooking>(
    `/api/v1/${tenantSlug}/scheduling/bookings/${bookingId}/complete/`,
  );
}

/** 标记预约爽约（Admin）。 */
export function staffBookingNoShow(tenantSlug: string, bookingId: number) {
  return staffApiClient.post<StaffBooking>(
    `/api/v1/${tenantSlug}/scheduling/bookings/${bookingId}/no-show/`,
  );
}
