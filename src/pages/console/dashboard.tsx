import { useQuery } from "@tanstack/react-query";

import { staffDashboardSummaryRetrieve } from "@/api/staff-dashboard";
import { tenantContextRetrieve } from "@/api/tenant";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载看板数据。</AlertDescription>
      </Alert>
    );
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">经营看板</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{data.reference_date}</span>
          {timeZone ? ` · ${timeZone}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="font-mono text-2xl tabular-nums">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel title="近 7 日预约趋势">
          {data.seven_day_trend.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul>
              {data.seven_day_trend.map((point, index) => (
                <li key={point.date}>
                  {index > 0 ? <Separator className="my-0" /> : null}
                  <div className="flex justify-between py-2 text-sm">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {point.date}
                    </span>
                    <span className="font-mono tabular-nums font-medium">{point.count} 单</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel title="热门服务">
          {data.popular_services.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul>
              {data.popular_services.map((item, index) => (
                <li key={item.service_id}>
                  {index > 0 ? <Separator className="my-0" /> : null}
                  <div className="flex justify-between gap-4 py-2 text-sm">
                    <span>{item.service_name}</span>
                    <span className="shrink-0 font-mono tabular-nums font-medium">
                      {item.count} 单
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel title="按地点分布">
          {data.bookings_by_location.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul>
              {data.bookings_by_location.map((item, index) => (
                <li key={item.location_id}>
                  {index > 0 ? <Separator className="my-0" /> : null}
                  <div className="flex justify-between gap-4 py-2 text-sm">
                    <span>{item.location_name}</span>
                    <span className="shrink-0 font-mono tabular-nums font-medium">
                      {item.count} 单
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel title="资源利用率">
          {data.resource_utilization.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul>
              {data.resource_utilization.map((item, index) => (
                <li key={item.resource_id}>
                  {index > 0 ? <Separator className="my-0" /> : null}
                  <div className="flex justify-between gap-4 py-2 text-sm">
                    <span>{item.resource_name}</span>
                    <span className="shrink-0 font-mono tabular-nums font-medium">
                      {(item.utilization_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>
      </div>
    </div>
  );
}

function DataPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyHint() {
  return <p className="text-sm text-muted-foreground">暂无数据</p>;
}
