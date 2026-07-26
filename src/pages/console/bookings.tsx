import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  staffBookingComplete,
  staffBookingConfirm,
  staffBookingList,
  staffBookingNoShow,
  staffBookingReject,
} from "@/api/staff-bookings";
import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConsoleSession } from "@/lib/console-session";
import { staffIsAdmin } from "@/lib/staff-role";
import { formatDateTime } from "@/lib/utils";
import type { ApiError } from "@/types/api";

/** 预约管理列表（Staff+ 查看，Admin 可操作）。 */
export function ConsoleBookingsPage() {
  const { tenantSlug, role } = useConsoleSession();
  const isAdmin = staffIsAdmin(role);
  const queryClient = useQueryClient();

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

  if (bookingsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">加载预约列表…</p>;
  }

  if (bookingsQuery.isError) {
    return <Alert variant="destructive">无法加载预约列表。</Alert>;
  }

  const bookings = bookingsQuery.data?.bookings ?? [];
  const timeZone = tenantQuery.data?.timezone;

  const serviceName = (id: number) =>
    catalogQuery.data?.services.find((s) => s.id === id)?.name ?? `服务 #${id}`;
  const locationName = (id: number) =>
    catalogQuery.data?.locations.find((l) => l.id === id)?.name ?? `地点 #${id}`;

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">预约管理</h1>
        <p className="page-lead">
          {isAdmin ? "处理待确认与进行中的订单。" : "查看与您关联资源的预约。"}
        </p>
      </header>

      {bookings.length === 0 ? (
        <Alert>暂无预约记录。</Alert>
      ) : (
        <div className="section-panel">
          {bookings.map((booking) => (
            <div key={booking.id} className="border-b border-border px-4 py-4 last:border-b-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                    {locationName(booking.location_id)} · 人数 {booking.party_size}
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
        </div>
      )}
    </div>
  );
}
