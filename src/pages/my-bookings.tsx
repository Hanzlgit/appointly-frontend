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
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { bookingCanCancel, bookingCanReschedule } from "@/lib/booking-status";
import type { BookableSlot } from "@/lib/booking-slots";
import { createIdempotencyKey, formatDateTime } from "@/lib/utils";
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
      <Card>
        <CardHeader>
          <CardTitle>需要登录</CardTitle>
          <CardDescription>登录后可查看与管理您的预约。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={`/t/${tenantSlug}/login?redirect=${redirect}`}>去登录</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (bookingsQuery.isLoading) {
    return <p className="text-muted-foreground">加载中…</p>;
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

  const locationName = (locationId: number) =>
    locations.find((location) => location.id === locationId)?.name ?? `地点 #${locationId}`;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">我的预约</h1>
        <p className="text-muted-foreground">查看状态、改期或取消预约。</p>
      </section>

      {bookings.length === 0 ? (
        <Alert>暂无预约记录。</Alert>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => {
            const isRescheduling = reschedulingBooking?.id === booking.id;
            const canModify = bookingCanCancel(booking.status);
            const canReschedule = bookingCanReschedule(booking.status);

            return (
              <Card key={booking.id}>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle>{serviceName(booking.service_id)}</CardTitle>
                    <CardDescription>
                      {formatDateTime(booking.start, timeZone)} —{" "}
                      {formatDateTime(booking.end, timeZone)}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground">{locationName(booking.location_id)}</p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    预约 #{booking.id} · 人数 {booking.party_size}
                    {booking.contact_name ? ` · ${booking.contact_name}` : ""}
                    {booking.rescheduled_from_id ? (
                      <span> · 改期自 #{booking.rescheduled_from_id}</span>
                    ) : null}
                    {booking.rescheduled_to_id ? (
                      <span> · 已改至 #{booking.rescheduled_to_id}</span>
                    ) : null}
                  </div>

                  {canModify ? (
                    <div className="flex flex-wrap gap-2">
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
                        取消预约
                      </Button>
                    </div>
                  ) : null}

                  {isRescheduling ? (
                    <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-4">
                      <p className="text-sm font-medium">选择新的预约时间</p>
                      {rescheduleError ? (
                        <Alert variant="destructive">{rescheduleError}</Alert>
                      ) : null}
                      <SlotPicker
                        tenantSlug={tenantSlug}
                        serviceId={booking.service_id}
                        locationId={booking.location_id}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
