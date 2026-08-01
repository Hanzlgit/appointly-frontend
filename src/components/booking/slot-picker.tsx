import { addDays, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { schedulingAvailabilityQuery } from "@/api/scheduling";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
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
      <Card>
        <CardHeader>
          <CardTitle>日期</CardTitle>
        </CardHeader>
        <CardContent>
          <DatePicker
            className="max-w-xs"
            value={selectedDate}
            onValueChange={(date) => {
              onSelectedDateChange(date);
              onSelectedSlotChange(null);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>可用时段</CardTitle>
          {location ? <CardDescription>{location.name}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {availabilityQuery.isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-24" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <Alert>
              <AlertDescription>
                该日期暂无可用时段。若选的是今天，时段可能已过，请换一天。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.key === slot.key;
                return (
                  <Button
                    key={slot.key}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn("font-mono tabular-nums")}
                    onClick={() => onSelectedSlotChange(slot)}
                  >
                    {formatDateTime(slot.start, timeZone)}
                    <span className="opacity-70">剩余名额 {slot.remaining_capacity}</span>
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
