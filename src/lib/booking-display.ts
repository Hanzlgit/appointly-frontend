import type { Booking } from "@/types/api";

type BookingMetaFields = Pick<
  Booking,
  "location_name" | "resource_name" | "location_is_active" | "resource_is_active"
>;

/** 预约卡片元信息片段（门店 · 资源）。 */
export function bookingMetaParts(booking: BookingMetaFields): string[] {
  return [booking.location_name, booking.resource_name];
}

/** 合并为元信息单行文案。 */
export function bookingMetaLine(booking: BookingMetaFields): string {
  return bookingMetaParts(booking).join(" · ");
}

/** 门店或资源是否已停用。 */
export function bookingHasInactivePlace(booking: BookingMetaFields): boolean {
  return !booking.location_is_active || !booking.resource_is_active;
}
