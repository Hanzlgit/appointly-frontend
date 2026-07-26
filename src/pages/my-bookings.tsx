import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { schedulingBookingCancel, schedulingBookingList } from "@/api/scheduling";
import { tenantContextRetrieve } from "@/api/tenant";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { formatDateTime } from "@/lib/utils";
import type { ApiError } from "@/types/api";

/** 我的预约列表页。 */
export function MyBookingsPage() {
  const { tenantSlug = "" } = useParams();
  const queryClient = useQueryClient();

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">我的预约</h1>
        <p className="text-muted-foreground">查看状态或取消预约。</p>
      </section>

      {bookings.length === 0 ? (
        <Alert>暂无预约记录。</Alert>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>预约 #{booking.id}</CardTitle>
                  <CardDescription>
                    {formatDateTime(booking.start, timeZone)} — {formatDateTime(booking.end, timeZone)}
                  </CardDescription>
                </div>
                <Badge>{booking.status}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  人数 {booking.party_size}
                  {booking.contact_name ? ` · ${booking.contact_name}` : ""}
                </div>
                {booking.status === "pending" || booking.status === "confirmed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(booking.id)}
                  >
                    取消
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
