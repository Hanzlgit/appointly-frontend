import { useQuery } from "@tanstack/react-query";

import {
  staffCatalogLocationList,
  staffCatalogResourceList,
  staffCatalogServiceList,
} from "@/api/staff-catalog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <p className="text-muted-foreground">加载目录…</p>;
  }

  if (isError) {
    return <Alert variant="destructive">无法加载服务目录。</Alert>;
  }

  const locations = locationsQuery.data!.locations;
  const services = servicesQuery.data!.services;
  const resources = resourcesQuery.data!.resources;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">服务目录</h1>
        <p className="text-muted-foreground">地点、服务与资源的当前配置。</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>地点</CardTitle>
          <CardDescription>{locations.length} 个地点</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无地点</p>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border/80 p-3"
              >
                <div>
                  <p className="font-medium">{location.name}</p>
                  <p className="text-sm text-muted-foreground">{location.address || "无地址"}</p>
                  <p className="text-xs text-muted-foreground">
                    关联资源 {location.resource_ids.length} 个
                  </p>
                </div>
                <Badge>{location.is_active ? "启用" : "停用"}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>服务</CardTitle>
          <CardDescription>{services.length} 项服务</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/80 p-3"
            >
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {service.duration_minutes} 分钟 ·{" "}
                  {formatPrice(service.price_cents, service.currency)}
                </p>
                {service.description ? (
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                ) : null}
              </div>
              <Badge>{service.is_active ? "启用" : "停用"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>资源</CardTitle>
          <CardDescription>{resources.length} 个资源</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/80 p-3"
            >
              <div>
                <p className="font-medium">{resource.name}</p>
                <p className="text-sm text-muted-foreground">
                  类型 {resource.resource_type} · 地点 {resource.location_ids.join(", ") || "—"}
                </p>
              </div>
              <Badge>{resource.is_active ? "启用" : "停用"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
