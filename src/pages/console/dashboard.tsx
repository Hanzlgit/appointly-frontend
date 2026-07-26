import { useQuery } from "@tanstack/react-query";

import { staffDashboardSummaryRetrieve } from "@/api/staff-dashboard";
import { tenantContextRetrieve } from "@/api/tenant";
import { Alert } from "@/components/ui/alert";
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
    return <p className="text-sm text-muted-foreground">加载看板数据…</p>;
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
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">经营看板</h1>
        <p className="page-lead">
          <span className="font-mono tabular-nums">{data.reference_date}</span>
          {timeZone ? ` · ${timeZone}` : ""}
        </p>
      </header>

      <div className="stat-strip">
        {statCards.map((item) => (
          <div key={item.label} className="stat-cell">
            <p className="stat-label">{item.label}</p>
            <p className="stat-value">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel title="近 7 日预约趋势">
          {data.seven_day_trend.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="divide-y divide-border">
              {data.seven_day_trend.map((point) => (
                <li key={point.date} className="flex justify-between py-2 text-sm">
                  <span className="font-mono tabular-nums text-muted-foreground">{point.date}</span>
                  <span className="font-mono tabular-nums font-medium">{point.count} 单</span>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel title="热门服务">
          {data.popular_services.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="divide-y divide-border">
              {data.popular_services.map((item) => (
                <li key={item.service_id} className="flex justify-between gap-4 py-2 text-sm">
                  <span>{item.service_name}</span>
                  <span className="shrink-0 font-mono tabular-nums font-medium">
                    {item.count} 单
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel title="按地点分布">
          {data.bookings_by_location.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="divide-y divide-border">
              {data.bookings_by_location.map((item) => (
                <li key={item.location_id} className="flex justify-between gap-4 py-2 text-sm">
                  <span>{item.location_name}</span>
                  <span className="shrink-0 font-mono tabular-nums font-medium">
                    {item.count} 单
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel title="资源利用率">
          {data.resource_utilization.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="divide-y divide-border">
              {data.resource_utilization.map((item) => (
                <li key={item.resource_id} className="flex justify-between gap-4 py-2 text-sm">
                  <span>{item.resource_name}</span>
                  <span className="shrink-0 font-mono tabular-nums font-medium">
                    {(item.utilization_rate * 100).toFixed(0)}%
                  </span>
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
    <div className="section-panel">
      <div className="section-panel-header">
        <h3 className="section-panel-title">{title}</h3>
      </div>
      <div className="section-panel-body">{children}</div>
    </div>
  );
}

function EmptyHint() {
  return <p className="text-sm text-muted-foreground">暂无数据</p>;
}
