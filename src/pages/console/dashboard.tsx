import { useQuery } from "@tanstack/react-query";

import { staffDashboardSummaryRetrieve } from "@/api/staff-dashboard";
import { tenantContextRetrieve } from "@/api/tenant";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConsoleSession } from "@/lib/console-session";
import { bookingStatusLabel } from "@/lib/booking-status";

/** 经营看板（Admin）。 */
export function ConsoleDashboardPage() {
  const { tenantSlug } = useConsoleSession();

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
  });

  const dashboardQuery = useQuery({
    queryKey: ["staff-dashboard", tenantSlug],
    queryFn: () => staffDashboardSummaryRetrieve(tenantSlug),
  });

  if (dashboardQuery.isLoading) {
    return <p className="text-muted-foreground">加载看板数据…</p>;
  }

  if (dashboardQuery.isError) {
    return <Alert variant="destructive">无法加载看板数据。</Alert>;
  }

  const data = dashboardQuery.data!;
  const summary = data.today_summary;
  const timeZone = tenantQuery.data?.timezone;

  const statCards = [
    { label: bookingStatusLabel("pending"), value: summary.pending },
    { label: bookingStatusLabel("confirmed"), value: summary.confirmed },
    { label: bookingStatusLabel("completed"), value: summary.completed },
    { label: bookingStatusLabel("cancelled"), value: summary.cancelled },
    { label: bookingStatusLabel("no_show"), value: summary.no_show },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">经营看板</h1>
        <p className="text-muted-foreground">
          参考日期 {data.reference_date}
          {timeZone ? ` · ${timeZone}` : ""}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>近 7 日预约趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {data.seven_day_trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.seven_day_trend.map((point) => (
                  <li key={point.date} className="flex justify-between">
                    <span>{point.date}</span>
                    <span className="font-medium">{point.count} 单</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>热门服务</CardTitle>
          </CardHeader>
          <CardContent>
            {data.popular_services.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.popular_services.map((item) => (
                  <li key={item.service_id} className="flex justify-between">
                    <span>{item.service_name}</span>
                    <span className="font-medium">{item.count} 单</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>按地点分布</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bookings_by_location.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.bookings_by_location.map((item) => (
                  <li key={item.location_id} className="flex justify-between">
                    <span>{item.location_name}</span>
                    <span className="font-medium">{item.count} 单</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>资源利用率</CardTitle>
          </CardHeader>
          <CardContent>
            {data.resource_utilization.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.resource_utilization.map((item) => (
                  <li key={item.resource_id} className="flex justify-between gap-4">
                    <span>{item.resource_name}</span>
                    <span className="font-medium">
                      {(item.utilization_rate * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
