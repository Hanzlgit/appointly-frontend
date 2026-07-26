import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarSearch, MapPin, SearchX, Store } from "lucide-react";

import { catalogPublicBrowse } from "@/api/tenant";
import { LocationDetail } from "@/components/catalog/location-detail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { findLocation, serviceCountByLocation, servicesForLocation } from "@/lib/catalog";
import { apiErrorMessage } from "@/lib/api-error";
import { matchesFields, sortServices, type ServiceSortKey } from "@/lib/list-filters";
import { cn, formatPrice } from "@/lib/utils";
import type { CatalogPublicService } from "@/types/api";

const SERVICE_SORT_OPTIONS = [
  { value: "name", label: "按名称" },
  { value: "price-asc", label: "价格从低到高" },
  { value: "price-desc", label: "价格从高到低" },
  { value: "duration-asc", label: "时长从短到长" },
  { value: "duration-desc", label: "时长从长到短" },
];

/** 租户首页：先选门店，再选服务。 */
export function TenantHomePage() {
  const { tenantSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationIdParam = searchParams.get("locationId");
  const selectedLocationId = locationIdParam ? Number(locationIdParam) : null;

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ServiceSortKey>("name");
  const debouncedSearch = useDebouncedValue(search);

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
  });

  const locations = catalogQuery.data?.locations ?? [];
  const services = catalogQuery.data?.services ?? [];
  const selectedLocation =
    selectedLocationId != null ? findLocation(locations, selectedLocationId) : undefined;

  const storeServices = useMemo(() => {
    if (selectedLocationId == null) {
      return [];
    }
    const scoped = servicesForLocation(services, selectedLocationId);
    const filtered = scoped.filter((service) =>
      matchesFields(debouncedSearch, [service.name, service.description]),
    );
    return sortServices(filtered, sortKey);
  }, [services, selectedLocationId, debouncedSearch, sortKey]);

  const filteredLocations = useMemo(() => {
    const filtered = locations.filter((location) => {
      const count = serviceCountByLocation(services, location.id);
      const locationMatch = matchesFields(debouncedSearch, [location.name, location.address]);
      return (
        locationMatch ||
        (debouncedSearch && count > 0 && hasMatchingService(services, location.id, debouncedSearch))
      );
    });
    return filtered.sort((a, b) => {
      const countDiff =
        serviceCountByLocation(services, b.id) - serviceCountByLocation(services, a.id);
      if (countDiff !== 0) {
        return countDiff;
      }
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [locations, services, debouncedSearch]);

  const servicePagination = usePaginatedList(storeServices, {
    pageSize: 8,
    resetKeys: [debouncedSearch, sortKey, selectedLocationId],
  });

  const locationPagination = usePaginatedList(filteredLocations, {
    pageSize: 8,
    resetKeys: [debouncedSearch],
  });

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
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (catalogQuery.isError) {
    return (
      <EmptyState
        icon={Store}
        title="暂时无法加载"
        description={apiErrorMessage(catalogQuery.error, "预约信息加载失败，请稍后重试。")}
        action={
          <Button variant="outline" onClick={() => catalogQuery.refetch()}>
            重新加载
          </Button>
        }
      />
    );
  }

  if (locations.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeading title="在线预约" description="浏览服务并完成预约。" />
        <EmptyState
          icon={Store}
          title="暂无可预约门店"
          description="商家尚未发布可预约门店。请稍后再来，或联系商家确认是否已上线。"
        />
      </div>
    );
  }

  if (selectedLocation) {
    return (
      <div className="space-y-6">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜索服务名称或说明…"
          resultCount={storeServices.length}
          resultLabel="项服务"
          sort={{
            value: sortKey,
            onValueChange: (value) => setSortKey(value as ServiceSortKey),
            options: SERVICE_SORT_OPTIONS,
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>选择服务</CardTitle>
            <CardDescription>选定服务后将进入日期与时段选择。</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {storeServices.length === 0 ? (
              <div className="px-4 pb-4">
                {debouncedSearch ? (
                  <EmptyState
                    icon={SearchX}
                    title="没有匹配的服务"
                    description="试试更短的关键词，或清除搜索查看全部门店服务。"
                    action={
                      <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                        清除搜索
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={CalendarSearch}
                    title="该门店暂无可预约服务"
                    description="此门店还没有上线服务项目。你可以返回换一家门店看看。"
                    action={
                      locations.length > 1 ? (
                        <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>
                          返回选门店
                        </Button>
                      ) : undefined
                    }
                  />
                )}
              </div>
            ) : (
              <>
                {servicePagination.items.map((service, index) => (
                  <div key={service.id}>
                    {index > 0 ? <Separator /> : null}
                    <ServiceRow
                      service={service}
                      tenantSlug={tenantSlug}
                      locationId={selectedLocation.id}
                    />
                  </div>
                ))}
                <ListPagination
                  page={servicePagination.page}
                  totalPages={servicePagination.totalPages}
                  totalItems={servicePagination.totalItems}
                  pageSize={servicePagination.pageSize}
                  onPageChange={servicePagination.setPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading title="选择门店" description="先选门店，再挑选服务与时间。" />

      {filteredLocations.length === 0 ? (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="搜索门店名称或地址…"
            resultCount={0}
            resultLabel="家门店"
          />
          <EmptyState
            icon={SearchX}
            title="没有匹配的门店"
            description="试试搜索门店名称、地址，或清除搜索查看全部门店。"
            action={
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                清除搜索
              </Button>
            }
          />
        </>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>门店列表</CardTitle>
            <CardDescription>选择一家门店以查看可预约服务。</CardDescription>
            <div className="pt-2">
              <ListToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="搜索门店名称或地址…"
                resultCount={filteredLocations.length}
                resultLabel="家门店"
                className="space-y-2"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {locationPagination.items.map((location, index) => {
              const serviceCount = serviceCountByLocation(services, location.id);
              return (
                <div key={location.id}>
                  {index > 0 ? <Separator /> : null}
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50",
                      serviceCount === 0 && "cursor-not-allowed opacity-60",
                    )}
                    disabled={serviceCount === 0}
                    onClick={() => setSearchParams({ locationId: String(location.id) })}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <LocationDetail location={location} />
                      <p className="mt-1 text-sm text-muted-foreground">
                        {serviceCount > 0 ? `${serviceCount} 项服务可预约` : "暂无可预约服务"}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
            <ListPagination
              page={locationPagination.page}
              totalPages={locationPagination.totalPages}
              totalItems={locationPagination.totalItems}
              pageSize={locationPagination.pageSize}
              onPageChange={locationPagination.setPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  tenantSlug,
  locationId,
}: {
  service: CatalogPublicService;
  tenantSlug: string;
  locationId: number;
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-4">
      <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
        {service.duration_minutes}′
      </span>
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
        <Button
          size="sm"
          render={
            <Link
              to={`/t/${tenantSlug}/book?serviceId=${service.id}&locationId=${locationId}`}
            />
          }
        >
          预约
        </Button>
      </div>
    </div>
  );
}

function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function hasMatchingService(
  services: CatalogPublicService[],
  locationId: number,
  query: string,
): boolean {
  return servicesForLocation(services, locationId).some((service) =>
    matchesFields(query, [service.name, service.description]),
  );
}
