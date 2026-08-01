import type { Booking } from "@/types/api";

type BookingPlaceFields = Pick<
  Booking,
  "location_name" | "location_address" | "location_is_active" | "resource_name" | "resource_is_active"
>;

/** 预约卡片上的门店行文案。 */
export function bookingLocationLine(booking: BookingPlaceFields): string {
  const suffix = booking.location_is_active ? "" : "（已停业）";
  return `门店 · ${booking.location_name}${suffix}`;
}

/** 预约卡片上的资源行文案（名称即标签，适配人员/房间/设备等）。 */
export function bookingResourceLine(booking: BookingPlaceFields): string {
  const suffix = booking.resource_is_active ? "" : "（已停用）";
  return `${booking.resource_name}${suffix}`;
}
