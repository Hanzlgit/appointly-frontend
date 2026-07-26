import { addDays, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { schedulingAvailabilityQuery } from "@/api/scheduling";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  availabilityToBookableSlots,
  filterSlotsByLocation,
  filterUpcomingSlots,
  type BookableSlot,
} from "@/lib/booking-slots";
import { cn, formatDateTime } from "@/lib/utils";
import type { CatalogPublicLocation } from "@/types/api";

interface SlotPickerProps {
  tenantSlug: string;
  serviceId: number;
  locationId?: number | null;
  location?: CatalogPublicLocation | null;
  /** 传入时使用 resource 模式，返回带 time_slot_id 的时段（改期必需）。 */
  resourceId?: number | null;
  timeZone?: string;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  selectedSlot: BookableSlot | null;
  onSelectedSlotChange: (slot: BookableSlot | null) => void;
  excludeTimeSlotId?: number;
}

/** 日期 + 可用时段选择器，供预约与改期复用。 */
export function SlotPicker({
  tenantSlug,
  serviceId,
  locationId = null,
  location = null,
  resourceId = null,
  timeZone,
  selectedDate,
  onSelectedDateChange,
  selectedSlot,
  onSelectedSlotChange,
  excludeTimeSlotId,
}: SlotPickerProps) {
  const availabilityRange = useMemo(() => {
    const start = startOfDay(new Date(`${selectedDate}T00:00:00`));
    const end = addDays(start, 1);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [selectedDate]);

  const availabilityQuery = useQuery({
    queryKey: ["availability", tenantSlug, serviceId, locationId, resourceId, selectedDate],
    queryFn: () =>
      schedulingAvailabilityQuery(tenantSlug, {
        ...availabilityRange,
        service_id: serviceId,
        location_id: locationId ?? undefined,
        resource_id: resourceId ?? undefined,
      }),
    enabled: serviceId > 0,
  });

  const slots = filterUpcomingSlots(
    filterSlotsByLocation(
      availabilityQuery.data ? availabilityToBookableSlots(availabilityQuery.data) : [],
      locationId,
    ),
  ).filter((slot) => excludeTimeSlotId == null || slot.time_slot_id !== excludeTimeSlotId);

  return (
    <div className="space-y-4">
      <div className="section-panel">
        <div className="section-panel-header">
          <h3 className="section-panel-title">日期</h3>
        </div>
        <div className="section-panel-body">
          <Input
            type="date"
            className="max-w-xs font-mono tabular-nums"
            value={selectedDate}
            onChange={(event) => {
              onSelectedDateChange(event.target.value);
              onSelectedSlotChange(null);
            }}
          />
        </div>
      </div>

      <div className="section-panel">
        <div className="section-panel-header">
          <h3 className="section-panel-title">
            可用时段
            {location ? (
              <span className="ml-2 font-normal text-muted-foreground">· {location.name}</span>
            ) : null}
          </h3>
        </div>
        <div className="section-panel-body">
          {availabilityQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">查询可用时段…</p>
          ) : slots.length === 0 ? (
            <Alert>
              该日期暂无可用时段。若选的是今天，时段可能已过，请换一天。
            </Alert>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.key === slot.key;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className={cn("slot-chip", isSelected && "slot-chip-selected")}
                    onClick={() => onSelectedSlotChange(slot)}
                  >
                    {formatDateTime(slot.start, timeZone)}
                    <span className="ml-1.5 opacity-70">余{slot.remaining_capacity}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
