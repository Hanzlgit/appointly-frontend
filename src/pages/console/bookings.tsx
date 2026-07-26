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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <p className="text-muted-foreground">加载预约列表…</p>;
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
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">预约管理</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "查看全部预约并处理待确认/进行中订单。" : "查看与您关联资源的预约。"}
        </p>
      </section>

      {bookings.length === 0 ? (
        <Alert>暂无预约记录。</Alert>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle>{serviceName(booking.service_id)}</CardTitle>
                  <CardDescription>
                    {formatDateTime(booking.start, timeZone)} —{" "}
                    {formatDateTime(booking.end, timeZone)}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground">
                    {locationName(booking.location_id)}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  预约 #{booking.id} · 人数 {booking.party_size}
                  {booking.contact_name ? ` · ${booking.contact_name}` : ""}
                  {booking.contact_phone ? ` · ${booking.contact_phone}` : ""}
                  {booking.customer_phone ? ` · 客户 ${booking.customer_phone}` : ""}
                </div>

                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
