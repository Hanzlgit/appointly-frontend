import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { bookingCanCancel, bookingCanReschedule } from "@/lib/booking-status";
import { bookingHasInactivePlace, bookingMetaLine } from "@/lib/booking-display";
import { cn, formatBookingWhen } from "@/lib/utils";
import type { Booking, CatalogPublicLocation } from "@/types/api";
import type { BookableSlot } from "@/lib/booking-slots";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BookingListItemProps {
  booking: Booking;
  timeZone?: string;
  location?: CatalogPublicLocation | null;
  tenantSlug: string;
  isRescheduling: boolean;
  rescheduleDate: string;
  rescheduleSlot: BookableSlot | null;
  rescheduleError: string | null;
  actionsDisabled: boolean;
  onOpenReschedule: () => void;
  onCloseReschedule: () => void;
  onRescheduleDateChange: (date: string) => void;
  onRescheduleSlotChange: (slot: BookableSlot | null) => void;
  onCancel: () => void;
  onConfirmReschedule: () => void;
}

/** 客户「我的预约」列表单项。 */
export function BookingListItem({
  booking,
  timeZone,
  location,
  tenantSlug,
  isRescheduling,
  rescheduleDate,
  rescheduleSlot,
  rescheduleError,
  actionsDisabled,
  onOpenReschedule,
  onCloseReschedule,
  onRescheduleDateChange,
  onRescheduleSlotChange,
  onCancel,
  onConfirmReschedule,
}: BookingListItemProps) {
  const canModify = bookingCanCancel(booking.status);
  const canReschedule = bookingCanReschedule(booking.status);
  const isInactive = !canModify;

  return (
    <div className={cn(isInactive && "opacity-80")}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-medium leading-snug">{booking.service_name}</p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatBookingWhen(booking.start, booking.end, timeZone)}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
            <p className="text-sm text-muted-foreground">{bookingMetaLine(booking)}</p>
            {bookingHasInactivePlace(booking) ? (
              <span className="inline-flex flex-wrap gap-1">
                {!booking.location_is_active ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    门店已停业
                  </Badge>
                ) : null}
                {!booking.resource_is_active ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    资源已停用
                  </Badge>
                ) : null}
              </span>
            ) : null}
          </div>
          {booking.location_address ? (
            <p className="text-xs text-muted-foreground">{booking.location_address}</p>
          ) : null}
        </div>

        {canModify ? (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-col sm:items-stretch">
            {canReschedule ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none sm:min-w-20"
                disabled={actionsDisabled}
                onClick={() => (isRescheduling ? onCloseReschedule() : onOpenReschedule())}
              >
                {isRescheduling ? "取消改期" : "改期"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none sm:min-w-20"
              disabled={actionsDisabled}
              onClick={onCancel}
            >
              取消
            </Button>
          </div>
        ) : null}
      </div>

      {isRescheduling ? (
        <div className="space-y-4 border-t bg-muted/30 px-4 py-4">
          <p className="text-sm font-medium">选择新的时间</p>
          {rescheduleError ? (
            <Alert variant="destructive">
              <AlertDescription>{rescheduleError}</AlertDescription>
            </Alert>
          ) : null}
          <SlotPicker
            tenantSlug={tenantSlug}
            serviceId={booking.service_id}
            locationId={booking.location_id}
            location={location}
            resourceId={booking.resource_id}
            timeZone={timeZone}
            selectedDate={rescheduleDate}
            onSelectedDateChange={onRescheduleDateChange}
            selectedSlot={rescheduleSlot}
            onSelectedSlotChange={onRescheduleSlotChange}
            excludeTimeSlotId={booking.time_slot_id}
          />
          <Button
            className="w-full"
            disabled={!rescheduleSlot?.time_slot_id || actionsDisabled}
            onClick={onConfirmReschedule}
          >
            确认改期
          </Button>
        </div>
      ) : null}
    </div>
  );
}
