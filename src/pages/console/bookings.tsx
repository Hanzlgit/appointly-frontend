import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCog, SearchX } from "lucide-react";

import {
  staffBookingComplete,
  staffBookingConfirm,
  staffBookingList,
  staffBookingNoShow,
  staffBookingReject,
} from "@/api/staff-bookings";
import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
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
import { useConsoleSession } from "@/lib/console-session";
import {
  filterBookingsByQuery,
  filterBookingsByStatus,
  sortBookingsByStart,
} from "@/lib/booking-filters";
import { bookingStatusLabel } from "@/lib/booking-status";
import { staffIsAdmin } from "@/lib/staff-role";
import { formatDateTime } from "@/lib/utils";
import type { ApiError } from "@/types/api";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "进行中" },
  { value: "pending", label: bookingStatusLabel("pending") },
  { value: "confirmed", label: bookingStatusLabel("confirmed") },
  { value: "completed", label: bookingStatusLabel("completed") },
  { value: "cancelled", label: bookingStatusLabel("cancelled") },
  { value: "no_show", label: bookingStatusLabel("no_show") },
];

/** 预约管理列表（Staff+ 查看，Admin 可操作）。 */
export function ConsoleBookingsPage() {
  const { tenantSlug, role } = useConsoleSession();
  const isAdmin = staffIsAdmin(role);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"start-asc" | "start-desc">("start-asc");
  const debouncedSearch = useDebouncedValue(search);

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
  });

  const bookingsQuery = useQuery({
    queryKey: ["staff-bookings", tenantSlug],
    queryFn: () => staffBookingList(tenantSlug),
  });

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-bookings", tenantSlug] });
    queryClient.invalidateQueries({ queryKey: ["staff-dashboard", tenantSlug] });
  };

  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      bookingId,
    }: {
      action: "confirm" | "reject" | "complete" | "no-show";
      bookingId: number;
    }) => {
      switch (action) {
        case "confirm":
          return staffBookingConfirm(tenantSlug, bookingId);
        case "reject":
          return staffBookingReject(tenantSlug, bookingId);
        case "complete":
          return staffBookingComplete(tenantSlug, bookingId);
        case "no-show":
          return staffBookingNoShow(tenantSlug, bookingId);
      }
    },
    onSuccess: invalidate,
    onError: (err: ApiError) => window.alert(err.message),
  });

  const locations = catalogQuery.data?.locations ?? [];
  const serviceName = (id: number) =>
    catalogQuery.data?.services.find((s) => s.id === id)?.name ?? `服务 #${id}`;
  const locationName = (id: number) =>
    locations.find((l) => l.id === id)?.name ?? `地点 #${id}`;

  const filteredBookings = useMemo(() => {
    const all = bookingsQuery.data?.bookings ?? [];
    const byStatus = filterBookingsByStatus(all, statusFilter);
    const byLocation =
      locationFilter === "all"
        ? byStatus
        : byStatus.filter((booking) => booking.location_id === Number(locationFilter));
    const byQuery = filterBookingsByQuery(byLocation, debouncedSearch, {
      serviceName,
      locationName,
    });
    return sortBookingsByStart(byQuery, sortKey === "start-asc" ? "asc" : "desc");
  }, [
    bookingsQuery.data?.bookings,
    statusFilter,
    locationFilter,
    debouncedSearch,
    sortKey,
    catalogQuery.data,
    locations,
  ]);

  const pagination = usePaginatedList(filteredBookings, {
    pageSize: 10,
    resetKeys: [debouncedSearch, statusFilter, locationFilter, sortKey],
  });

  if (bookingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (bookingsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载预约列表。</AlertDescription>
      </Alert>
    );
  }

  const allBookings = bookingsQuery.data?.bookings ?? [];
  const timeZone = tenantQuery.data?.timezone;

  const locationFilterOptions = [
    { value: "all", label: "全部门店" },
    ...locations.map((location) => ({ value: String(location.id), label: location.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">预约管理</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "处理待确认与进行中的订单。" : "查看与您关联资源的预约。"}
        </p>
      </div>

      {allBookings.length > 0 ? (
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜索服务、客户、预约号…"
          resultCount={filteredBookings.length}
          resultLabel="条预约"
          filters={[
            {
              value: statusFilter,
              onValueChange: setStatusFilter,
              placeholder: "状态",
              options: STATUS_FILTER_OPTIONS,
            },
            {
              value: locationFilter,
              onValueChange: setLocationFilter,
              placeholder: "门店",
              options: locationFilterOptions,
              className: "w-[10rem]",
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
          icon={CalendarCog}
          title="暂无预约记录"
          description={
            isAdmin
              ? "客户下单或代客预约后，订单会出现在这里。可先检查服务目录与排班是否已配置。"
              : "当前没有与您关联资源的预约。"
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
                setStatusFilter("all");
                setLocationFilter("all");
              }}
            >
              重置筛选
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {pagination.items.map((booking, index) => (
              <div key={booking.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{serviceName(booking.service_id)}</p>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                      {formatDateTime(booking.start, timeZone)}
                      <span className="text-muted-foreground">
                        {" — "}
                        {formatDateTime(booking.end, timeZone)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {locationName(booking.location_id)}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                      #{booking.id}
                      {booking.contact_name ? ` · ${booking.contact_name}` : ""}
                      {booking.contact_phone ? ` · ${booking.contact_phone}` : ""}
                      {booking.customer_phone ? ` · 客户 ${booking.customer_phone}` : ""}
                    </p>
                  </div>

                  {isAdmin ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {booking.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({ action: "confirm", bookingId: booking.id })
                            }
                          >
                            确认
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({ action: "reject", bookingId: booking.id })
                            }
                          >
                            拒绝
                          </Button>
                        </>
                      ) : null}
                      {booking.status === "confirmed" || booking.status === "started" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({ action: "complete", bookingId: booking.id })
                            }
                          >
                            完成
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({ action: "no-show", bookingId: booking.id })
                            }
                          >
                            标记爽约
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
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
