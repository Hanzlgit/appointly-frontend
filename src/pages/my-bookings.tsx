import { formatISO, parseISO, startOfDay } from "date-fns";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  schedulingBookingCancel,
  schedulingBookingList,
  schedulingBookingReschedule,
} from "@/api/scheduling";
import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { SlotPicker } from "@/components/booking/slot-picker";
import { LocationDetail } from "@/components/catalog/location-detail";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { bookingCanCancel, bookingCanReschedule } from "@/lib/booking-status";
import type { BookableSlot } from "@/lib/booking-slots";
import { createIdempotencyKey, formatBookingWhen } from "@/lib/utils";
import type { ApiError, Booking } from "@/types/api";

/** 我的预约列表页。 */
export function MyBookingsPage() {
  const { tenantSlug = "" } = useParams();
  const queryClient = useQueryClient();
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(() =>
    formatISO(startOfDay(new Date()), { representation: "date" }),
  );
  const [rescheduleSlot, setRescheduleSlot] = useState<BookableSlot | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
  });

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
  });

  const bookingsQuery = useQuery({
    queryKey: ["bookings", tenantSlug],
    queryFn: () => schedulingBookingList(tenantSlug),
    enabled: authIsLoggedIn(),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: number) => schedulingBookingCancel(tenantSlug, bookingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings", tenantSlug] }),
    onError: (err: ApiError) => window.alert(err.message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!reschedulingBooking || !rescheduleSlot?.time_slot_id) {
        throw new Error("请选择新时段");
      }

      return schedulingBookingReschedule(tenantSlug, reschedulingBooking.id, {
        time_slot_id: rescheduleSlot.time_slot_id,
        idempotency_key: createIdempotencyKey(),
      });
    },
    onSuccess: () => {
      setReschedulingBooking(null);
      setRescheduleSlot(null);
      setRescheduleError(null);
      queryClient.invalidateQueries({ queryKey: ["bookings", tenantSlug] });
    },
    onError: (err: ApiError) => setRescheduleError(err.message),
  });

  const openReschedule = (booking: Booking) => {
    setReschedulingBooking(booking);
    setRescheduleDate(
      formatISO(startOfDay(parseISO(booking.start)), { representation: "date" }),
    );
    setRescheduleSlot(null);
    setRescheduleError(null);
  };

  const closeReschedule = () => {
    setReschedulingBooking(null);
    setRescheduleSlot(null);
    setRescheduleError(null);
  };

  if (!authIsLoggedIn()) {
    const redirect = encodeURIComponent(`/t/${tenantSlug}/bookings`);
    return (
      <div className="space-y-6">
        <header className="page-header">
          <h1 className="page-title">需要登录</h1>
          <p className="page-lead">登录后可查看与管理预约。</p>
        </header>
        <Button asChild>
          <Link to={`/t/${tenantSlug}/login?redirect=${redirect}`}>去登录</Link>
        </Button>
      </div>
    );
  }

  if (bookingsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">正在加载预约…</p>;
  }

  if (bookingsQuery.isError) {
    return <Alert variant="destructive">无法加载预约列表，请稍后重试。</Alert>;
  }

  const bookings = bookingsQuery.data?.bookings ?? [];
  const timeZone = tenantQuery.data?.timezone;
  const services = catalogQuery.data?.services ?? [];
  const locations = catalogQuery.data?.locations ?? [];

  const serviceName = (serviceId: number) =>
    services.find((service) => service.id === serviceId)?.name ?? `服务 #${serviceId}`;

  const locationById = (locationId: number) =>
    locations.find((location) => location.id === locationId);

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">我的预约</h1>
        <p className="page-lead">查看状态、改期或取消。</p>
      </header>

      {bookings.length === 0 ? (
        <Alert>暂无预约记录。</Alert>
      ) : (
        <div className="section-panel">
          {bookings.map((booking) => {
            const isRescheduling = reschedulingBooking?.id === booking.id;
            const canModify = bookingCanCancel(booking.status);
            const canReschedule = bookingCanReschedule(booking.status);

            const bookingLocation = locationById(booking.location_id);

            return (
              <div key={booking.id} className="border-b border-border last:border-b-0">
                <div className="list-row flex-col items-stretch gap-3 sm:flex-row sm:items-start">
                  <div className="font-mono text-xs leading-relaxed tabular-nums text-muted-foreground sm:w-40 sm:shrink-0">
                    {formatBookingWhen(booking.start, booking.end, timeZone)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{serviceName(booking.service_id)}</p>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <div className="mt-1">
                      <LocationDetail
                        location={bookingLocation}
                        fallback={`地点 #${booking.location_id}`}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">人数 {booking.party_size}</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                      #{booking.id}
                      {booking.contact_name ? ` · ${booking.contact_name}` : ""}
                    </p>
                  </div>
                  {canModify ? (
                    <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                      {canReschedule ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancelMutation.isPending || rescheduleMutation.isPending}
                          onClick={() =>
                            isRescheduling ? closeReschedule() : openReschedule(booking)
                          }
                        >
                          {isRescheduling ? "取消改期" : "改期"}
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelMutation.isPending || rescheduleMutation.isPending}
                        onClick={() => cancelMutation.mutate(booking.id)}
                      >
                        取消
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isRescheduling ? (
                  <div className="space-y-4 border-t border-border bg-muted/40 px-4 py-4">
                    <p className="text-sm font-medium">选择新的时间</p>
                    {rescheduleError ? (
                      <Alert variant="destructive">{rescheduleError}</Alert>
                    ) : null}
                    <SlotPicker
                      tenantSlug={tenantSlug}
                      serviceId={booking.service_id}
                      locationId={booking.location_id}
                      location={bookingLocation}
                      resourceId={booking.resource_id}
                      timeZone={timeZone}
                      selectedDate={rescheduleDate}
                      onSelectedDateChange={setRescheduleDate}
                      selectedSlot={rescheduleSlot}
                      onSelectedSlotChange={setRescheduleSlot}
                      excludeTimeSlotId={booking.time_slot_id}
                    />
                    <Button
                      className="w-full"
                      disabled={!rescheduleSlot?.time_slot_id || rescheduleMutation.isPending}
                      onClick={() => rescheduleMutation.mutate()}
                    >
                      确认改期
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
