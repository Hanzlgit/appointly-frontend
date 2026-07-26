import type { AvailabilityResult } from "@/types/api";

export interface BookableSlot {
  key: string;
  start: string;
  end: string;
  remaining_capacity: number;
  location_id: number;
  time_slot_id?: number;
  resource_id?: number;
}

/** 将可用性查询结果统一为可预约时段列表。 */
export function availabilityToBookableSlots(result: AvailabilityResult): BookableSlot[] {
  if (result.mode === "resource") {
    return result.slots.map((slot) => ({
      key: `resource-${slot.time_slot_id}`,
      start: slot.start,
      end: slot.end,
      remaining_capacity: slot.remaining_capacity,
      location_id: slot.location_id,
      time_slot_id: slot.time_slot_id,
      resource_id: slot.resource_id,
    }));
  }

  return result.availability.map((item) => ({
    key: `aggregate-${item.service_id}-${item.location_id}-${item.start}`,
    start: item.start,
    end: item.end,
    remaining_capacity: item.remaining_capacity,
    location_id: item.location_id,
  }));
}

/** 过滤已开始的时段，只保留未来可预约项。 */
export function filterUpcomingSlots(slots: BookableSlot[]): BookableSlot[] {
  const now = Date.now();
  return slots.filter((slot) => new Date(slot.start).getTime() > now);
}

/** 按地点过滤时段列表。 */
export function filterSlotsByLocation(
  slots: BookableSlot[],
  locationId: number | null,
): BookableSlot[] {
  if (locationId == null) {
    return slots;
  }
  return slots.filter((slot) => slot.location_id === locationId);
}
