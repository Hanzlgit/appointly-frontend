import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";

import { catalogPublicBrowse } from "@/api/tenant";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

/** 租户首页：展示可预约服务列表。 */
export function TenantHomePage() {
  const { tenantSlug = "" } = useParams();

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
  });

  if (catalogQuery.isLoading) {
    return <p className="text-muted-foreground">加载中…</p>;
  }

  if (catalogQuery.isError) {
    return <Alert variant="destructive">无法加载服务列表，请确认租户 slug 是否正确。</Alert>;
  }

  const { services, locations } = catalogQuery.data!;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">选择服务</h1>
        <p className="text-muted-foreground">
          {locations.length > 0
            ? `共有 ${locations.length} 个地点、${services.length} 项服务可预约。`
            : "浏览服务并开始预约。"}
        </p>
      </section>

      {services.length === 0 ? (
        <Alert>暂无可预约服务。</Alert>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                <CardDescription>{service.description || "暂无描述"}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-4" />
                    {service.duration_minutes} 分钟
                  </span>
                  <span>{formatPrice(service.price_cents, service.currency)}</span>
                </div>
                <Button asChild>
                  <Link to={`/t/${tenantSlug}/book?serviceId=${service.id}`}>立即预约</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
