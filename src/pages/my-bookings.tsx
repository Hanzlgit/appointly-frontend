import { formatISO, parseISO, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, SearchX } from "lucide-react";

import {
  schedulingBookingCancel,
  schedulingBookingList,
  schedulingBookingReschedule,
} from "@/api/scheduling";
import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { SlotPicker } from "@/components/booking/slot-picker";
import { LocationDetail } from "@/components/catalog/location-detail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { authIsLoggedIn } from "@/lib/auth-storage";
import {
  filterBookingsByQuery,
  filterBookingsByStatus,
  filterBookingsByTime,
  sortBookingsByStart,
  type BookingTimeFilter,
} from "@/lib/booking-filters";
import { bookingCanCancel, bookingCanReschedule, bookingStatusLabel } from "@/lib/booking-status";
import type { BookableSlot } from "@/lib/booking-slots";
import { createIdempotencyKey, formatBookingWhen } from "@/lib/utils";
import type { ApiError, Booking } from "@/types/api";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "进行中" },
  { value: "pending", label: bookingStatusLabel("pending") },
  { value: "confirmed", label: bookingStatusLabel("confirmed") },
  { value: "completed", label: bookingStatusLabel("completed") },
  { value: "cancelled", label: bookingStatusLabel("cancelled") },
];

/** 我的预约列表页。 */
export function MyBookingsPage() {
  const { tenantSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const justBooked = searchParams.get("success") === "1";

  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<BookingTimeFilter>("upcoming");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"start-asc" | "start-desc">("start-asc");
  const debouncedSearch = useDebouncedValue(search);

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

  const services = catalogQuery.data?.services ?? [];
  const locations = catalogQuery.data?.locations ?? [];
  const serviceName = (serviceId: number) =>
    services.find((service) => service.id === serviceId)?.name ?? `服务 #${serviceId}`;
  const locationName = (locationId: number) =>
    locations.find((location) => location.id === locationId)?.name ?? `地点 #${locationId}`;
  const locationById = (locationId: number) =>
    locations.find((location) => location.id === locationId);

  const filteredBookings = useMemo(() => {
    const all = bookingsQuery.data?.bookings ?? [];
    const byTime = filterBookingsByTime(all, timeFilter);
    const byStatus = filterBookingsByStatus(byTime, statusFilter);
    const byQuery = filterBookingsByQuery(byStatus, debouncedSearch, {
      serviceName,
      locationName,
    });
    return sortBookingsByStart(byQuery, sortKey === "start-asc" ? "asc" : "desc");
  }, [bookingsQuery.data?.bookings, timeFilter, statusFilter, debouncedSearch, sortKey, services, locations]);

  const pagination = usePaginatedList(filteredBookings, {
    pageSize: 8,
    resetKeys: [debouncedSearch, timeFilter, statusFilter, sortKey],
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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">需要登录</h1>
          <p className="text-sm text-muted-foreground">登录后可查看与管理预约。</p>
        </div>
        <Button render={<Link to={`/t/${tenantSlug}/login?redirect=${redirect}`} />}>
          去登录
        </Button>
      </div>
    );
  }

  if (bookingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (bookingsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载预约列表，请稍后重试。</AlertDescription>
      </Alert>
    );
  }

  const allBookings = bookingsQuery.data?.bookings ?? [];
  const timeZone = tenantQuery.data?.timezone;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">我的预约</h1>
        <p className="text-sm text-muted-foreground">查看状态、改期或取消。</p>
      </div>

      {justBooked ? (
        <Alert>
          <AlertDescription>预约已提交，可在下方查看详情。</AlertDescription>
        </Alert>
      ) : null}

      {allBookings.length > 0 ? (
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜索服务、门店、预约号…"
          resultCount={filteredBookings.length}
          resultLabel="条预约"
          filters={[
            {
              value: timeFilter,
              onValueChange: (value) => setTimeFilter(value as BookingTimeFilter),
              placeholder: "时间",
              options: [
                { value: "all", label: "全部时间" },
                { value: "upcoming", label: "即将到来" },
                { value: "past", label: "历史记录" },
              ],
            },
            {
              value: statusFilter,
              onValueChange: setStatusFilter,
              placeholder: "状态",
              options: STATUS_FILTER_OPTIONS,
            },
          ]}
          sort={{
            value: sortKey,
            onValueChange: (value) => setSortKey(value as "start-asc" | "start-desc"),
            options: [
              { value: "start-asc", label: "时间从近到远" },
              { value: "start-desc", label: "时间从远到近" },
            ],
          }}
        />
      ) : null}

      {allBookings.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="还没有预约"
          description="浏览服务并选择合适的时间，你的预约记录会显示在这里。"
          action={
            <Button render={<Link to={`/t/${tenantSlug}`} />}>去预约</Button>
          }
        />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="没有匹配的预约"
          description="试试调整筛选条件，或清除搜索查看全部记录。"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setTimeFilter("all");
                setStatusFilter("all");
              }}
            >
              重置筛选
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {pagination.items.map((booking, index) => {
              const isRescheduling = reschedulingBooking?.id === booking.id;
              const canModify = bookingCanCancel(booking.status);
              const canReschedule = bookingCanReschedule(booking.status);
              const bookingLocation = locationById(booking.location_id);

              return (
                <div key={booking.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
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
            <ListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
