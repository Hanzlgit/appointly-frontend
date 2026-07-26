import { useQuery } from "@tanstack/react-query";

import {
  staffCatalogLocationList,
  staffCatalogResourceList,
  staffCatalogServiceList,
} from "@/api/staff-catalog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useConsoleSession } from "@/lib/console-session";
import { formatPrice } from "@/lib/utils";

/** 服务目录概览（Admin，只读列表）。 */
export function ConsoleCatalogPage() {
  const { tenantSlug } = useConsoleSession();

  const locationsQuery = useQuery({
    queryKey: ["staff-catalog-locations", tenantSlug],
    queryFn: () => staffCatalogLocationList(tenantSlug),
  });

  const servicesQuery = useQuery({
    queryKey: ["staff-catalog-services", tenantSlug],
    queryFn: () => staffCatalogServiceList(tenantSlug),
  });

  const resourcesQuery = useQuery({
    queryKey: ["staff-catalog-resources", tenantSlug],
    queryFn: () => staffCatalogResourceList(tenantSlug),
  });

  const isLoading =
    locationsQuery.isLoading || servicesQuery.isLoading || resourcesQuery.isLoading;
  const isError = locationsQuery.isError || servicesQuery.isError || resourcesQuery.isError;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">加载目录…</p>;
  }

  if (isError) {
    return <Alert variant="destructive">无法加载服务目录。</Alert>;
  }

  const locations = locationsQuery.data!.locations;
  const services = servicesQuery.data!.services;
  const resources = resourcesQuery.data!.resources;

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">服务目录</h1>
        <p className="page-lead">地点、服务与资源的当前配置。</p>
      </header>

      <CatalogSection title="地点" count={locations.length}>
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无地点</p>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="list-row">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{location.name}</p>
                <p className="text-sm text-muted-foreground">{location.address || "无地址"}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  资源 {location.resource_ids.length} 个
                </p>
              </div>
              <Badge>{location.is_active ? "启用" : "停用"}</Badge>
            </div>
          ))
        )}
      </CatalogSection>

      <CatalogSection title="服务" count={services.length}>
        {services.map((service) => (
          <div key={service.id} className="list-row">
            <span className="time-rail">{service.duration_minutes}′</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{service.name}</p>
              {service.description ? (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatPrice(service.price_cents, service.currency)}
              </span>
              <Badge>{service.is_active ? "启用" : "停用"}</Badge>
            </div>
          </div>
        ))}
      </CatalogSection>

      <CatalogSection title="资源" count={resources.length}>
        {resources.map((resource) => (
          <div key={resource.id} className="list-row">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{resource.name}</p>
              <p className="text-sm text-muted-foreground">
                类型 {resource.resource_type} · 地点 {resource.location_ids.join(", ") || "—"}
              </p>
            </div>
            <Badge>{resource.is_active ? "启用" : "停用"}</Badge>
          </div>
        ))}
      </CatalogSection>
    </div>
  );
}

function CatalogSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="section-panel">
      <div className="section-panel-header flex items-baseline justify-between">
        <h3 className="section-panel-title">{title}</h3>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
