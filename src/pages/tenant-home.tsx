import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { catalogPublicBrowse } from "@/api/tenant";
import { LocationDetail } from "@/components/catalog/location-detail";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { findLocation, serviceCountByLocation, servicesForLocation } from "@/lib/catalog";
import { apiErrorMessage } from "@/lib/api-error";
import { cn, formatPrice } from "@/lib/utils";

/** 租户首页：先选门店，再选服务。 */
export function TenantHomePage() {
  const { tenantSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationIdParam = searchParams.get("locationId");
  const selectedLocationId = locationIdParam ? Number(locationIdParam) : null;

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
  });

  const locations = catalogQuery.data?.locations ?? [];
  const services = catalogQuery.data?.services ?? [];
  const selectedLocation =
    selectedLocationId != null ? findLocation(locations, selectedLocationId) : undefined;
  const storeServices =
    selectedLocationId != null ? servicesForLocation(services, selectedLocationId) : [];

  useEffect(() => {
    if (catalogQuery.isLoading || locations.length !== 1) {
      return;
    }
    const onlyLocation = locations[0]!;
    if (selectedLocationId === onlyLocation.id) {
      return;
    }
    setSearchParams({ locationId: String(onlyLocation.id) }, { replace: true });
  }, [catalogQuery.isLoading, locations, selectedLocationId, setSearchParams]);

  if (catalogQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">正在加载…</p>;
  }

  if (catalogQuery.isError) {
    return (
      <Alert variant="destructive">
        {apiErrorMessage(catalogQuery.error, "无法加载预约信息。")}
      </Alert>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="space-y-6">
        <header className="page-header">
          <h1 className="page-title">在线预约</h1>
        </header>
        <Alert>暂无可预约门店。</Alert>
      </div>
    );
  }

  if (selectedLocation) {
    return (
      <div className="space-y-8">
        <header className="page-header">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">当前门店</p>
              <h1 className="page-title">{selectedLocation.name}</h1>
              {selectedLocation.address ? (
                <p className="page-lead">{selectedLocation.address}</p>
              ) : null}
            </div>
            {locations.length > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setSearchParams({})}
              >
                换门店
              </Button>
            ) : null}
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">选择服务</h2>
          {storeServices.length === 0 ? (
            <Alert>该门店暂无可预约服务。</Alert>
          ) : (
            <div className="section-panel">
              {storeServices.map((service) => (
                <div key={service.id} className="list-row items-start">
                  <span className="time-rail pt-0.5">{service.duration_minutes}′</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{service.name}</p>
                    {service.description ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{service.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 pt-0.5">
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatPrice(service.price_cents, service.currency)}
                    </span>
                    <Button asChild size="sm">
                      <Link
                        to={`/t/${tenantSlug}/book?serviceId=${service.id}&locationId=${selectedLocation.id}`}
                      >
                        预约
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">选择门店</h1>
        <p className="page-lead">先选门店，再挑选服务与时间。</p>
      </header>

      <div className="section-panel">
        {locations.map((location) => {
          const serviceCount = serviceCountByLocation(services, location.id);
          return (
            <button
              key={location.id}
              type="button"
              className={cn(
                "list-row w-full items-start text-left transition-colors hover:bg-muted/40",
                serviceCount === 0 && "opacity-60",
              )}
              disabled={serviceCount === 0}
              onClick={() => setSearchParams({ locationId: String(location.id) })}
            >
              <div className="min-w-0 flex-1">
                <LocationDetail location={location} />
                <p className="mt-1 text-sm text-muted-foreground">
                  {serviceCount > 0 ? `${serviceCount} 项服务可预约` : "暂无可预约服务"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
