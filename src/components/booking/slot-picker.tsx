import { addDays, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { schedulingAvailabilityQuery } from "@/api/scheduling";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  availabilityToBookableSlots,
  filterSlotsByLocation,
  filterUpcomingSlots,
  type BookableSlot,
} from "@/lib/booking-slots";
import { formatDateTime } from "@/lib/utils";

interface SlotPickerProps {
  tenantSlug: string;
  serviceId: number;
  locationId?: number | null;
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
      <Card>
        <CardHeader>
          <CardTitle>选择日期</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              onSelectedDateChange(event.target.value);
              onSelectedSlotChange(null);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>可用时段</CardTitle>
          <CardDescription>点击选择合适的时间。</CardDescription>
        </CardHeader>
        <CardContent>
          {availabilityQuery.isLoading ? (
            <p className="text-muted-foreground">查询可用时段中…</p>
          ) : slots.length === 0 ? (
            <Alert>
              该日期暂无可用时段。若选的是今天，可能时段已过，请尝试选择明天或之后的日期。
            </Alert>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.key === slot.key;
                return (
                  <Button
                    key={slot.key}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => onSelectedSlotChange(slot)}
                  >
                    {formatDateTime(slot.start, timeZone)} · 余 {slot.remaining_capacity}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
