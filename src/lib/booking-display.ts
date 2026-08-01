import type { Booking } from "@/types/api";

type BookingMetaFields = Pick<
  Booking,
  "location_name" | "resource_name" | "party_size" | "location_is_active" | "resource_is_active"
>;

/** 预约卡片元信息片段（门店 · 资源 · 人数）。 */
export function bookingMetaParts(booking: BookingMetaFields): string[] {
  const parts = [booking.location_name, booking.resource_name];
  if (booking.party_size > 1) {
    parts.push(`${booking.party_size}人`);
  }
  return parts;
}

/** 合并为元信息单行文案。 */
export function bookingMetaLine(booking: BookingMetaFields): string {
  return bookingMetaParts(booking).join(" · ");
}

/** 门店或资源是否已停用。 */
export function bookingHasInactivePlace(booking: BookingMetaFields): boolean {
  return !booking.location_is_active || !booking.resource_is_active;
}
