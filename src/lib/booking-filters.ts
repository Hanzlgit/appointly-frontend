import { isAfter, isBefore, parseISO } from "date-fns";

import type { Booking } from "@/types/api";
import type { StaffBooking } from "@/types/staff-api";
import { matchesFields } from "@/lib/list-filters";

export type BookingTimeFilter = "all" | "upcoming" | "past";

/** 按时间范围过滤预约。 */
export function filterBookingsByTime<T extends Pick<Booking, "start">>(
  bookings: T[],
  filter: BookingTimeFilter,
  now = new Date(),
): T[] {
  if (filter === "all") {
    return bookings;
  }
  return bookings.filter((booking) => {
    const start = parseISO(booking.start);
    return filter === "upcoming" ? !isBefore(start, now) : isBefore(start, now);
  });
}

/** 客户/员工预约列表文本搜索。 */
export function filterBookingsByQuery<T extends Booking | StaffBooking>(
  bookings: T[],
  query: string,
  labels: { serviceName: (id: number) => string; locationName: (id: number) => string },
): T[] {
  const normalized = query.trim();
  if (!normalized) {
    return bookings;
  }
  return bookings.filter((booking) =>
    matchesFields(normalized, [
      booking.id,
      labels.serviceName(booking.service_id),
      labels.locationName(booking.location_id),
      booking.contact_name,
      booking.contact_phone,
      "customer_phone" in booking ? booking.customer_phone : "",
      booking.status,
    ]),
  );
}

/** 按状态过滤；``active`` 表示仍可操作的预约。 */
export function filterBookingsByStatus<T extends Pick<Booking, "status">>(
  bookings: T[],
  status: string,
): T[] {
  if (status === "all") {
    return bookings;
  }
  if (status === "active") {
    return bookings.filter((booking) =>
      ["pending", "confirmed", "started"].includes(booking.status),
    );
  }
  return bookings.filter((booking) => booking.status === status);
}

/** 按开始时间排序（默认 upcoming 优先）。 */
export function sortBookingsByStart<T extends Pick<Booking, "start">>(
  bookings: T[],
  direction: "asc" | "desc" = "asc",
): T[] {
  return [...bookings].sort((a, b) => {
    const diff = parseISO(a.start).getTime() - parseISO(b.start).getTime();
    return direction === "asc" ? diff : -diff;
  });
}

/** 判断预约是否在未来（含进行中）。 */
export function isUpcomingBooking(start: string, now = new Date()): boolean {
  return !isBefore(parseISO(start), now) || isAfter(parseISO(start), now);
}
