import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Package, SearchX } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import {
  CatalogLocationFormDialog,
  CatalogResourceDeleteDialog,
  CatalogResourceFormDialog,
  CatalogServiceDeleteDialog,
  CatalogServiceFormDialog,
} from "@/pages/console/catalog-forms";

import {
  staffCatalogLocationResourceList,
  staffCatalogLocationRetrieve,
  staffCatalogLocationServiceList,
} from "@/api/staff-catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useConsoleSession } from "@/lib/console-session";
import { matchesFields, sortServices } from "@/lib/list-filters";
import { formatPrice } from "@/lib/utils";
import type { CatalogResource, CatalogService } from "@/types/staff-api";

type ActiveFilter = "all" | "active" | "inactive";
type LocationDetailTab = "services" | "resources";

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "仅启用" },
  { value: "inactive", label: "仅停用" },
];

function filterByActive<T extends { is_active: boolean }>(items: T[], filter: ActiveFilter): T[] {
  if (filter === "all") {
    return items;
  }
  return items.filter((item) => (filter === "active" ? item.is_active : !item.is_active));
}

/** 地点详情页：编辑地点信息并管理该地点下的服务与资源。 */
export function ConsoleCatalogLocationDetailPage() {
  const { tenantSlug } = useConsoleSession();
  const { locationId } = useParams<{ locationId: string }>();
  const parsedLocationId = Number(locationId);
  const queryClient = useQueryClient();
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [tab, setTab] = useState<LocationDetailTab>("services");

  const locationQuery = useQuery({
    queryKey: ["staff-catalog-location", tenantSlug, parsedLocationId],
    queryFn: () => staffCatalogLocationRetrieve(tenantSlug, parsedLocationId),
    enabled: Number.isFinite(parsedLocationId),
  });

  const resourcesQuery = useQuery({
    queryKey: ["staff-catalog-location-resources", tenantSlug, parsedLocationId],
    queryFn: () => staffCatalogLocationResourceList(tenantSlug, parsedLocationId),
    enabled: Number.isFinite(parsedLocationId),
  });

  const servicesQuery = useQuery({
    queryKey: ["staff-catalog-location-services", tenantSlug, parsedLocationId],
    queryFn: () => staffCatalogLocationServiceList(tenantSlug, parsedLocationId),
    enabled: Number.isFinite(parsedLocationId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-catalog-location", tenantSlug, parsedLocationId] });
    queryClient.invalidateQueries({
      queryKey: ["staff-catalog-location-resources", tenantSlug, parsedLocationId],
    });
    queryClient.invalidateQueries({
      queryKey: ["staff-catalog-location-services", tenantSlug, parsedLocationId],
    });
    queryClient.invalidateQueries({ queryKey: ["staff-catalog-locations", tenantSlug] });
  };

  if (!Number.isFinite(parsedLocationId)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无效的地点 ID。</AlertDescription>
      </Alert>
    );
  }

  if (locationQuery.isLoading || resourcesQuery.isLoading || servicesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (
    locationQuery.isError ||
    resourcesQuery.isError ||
    servicesQuery.isError ||
    !locationQuery.data
  ) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载地点详情。</AlertDescription>
      </Alert>
    );
  }

  const location = locationQuery.data;
  const resources = resourcesQuery.data!.resources;
  const services = servicesQuery.data!.services;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            to={`/t/${tenantSlug}/console/catalog`}
            className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground -ml-2"
          >
            <ArrowLeft className="size-4" />
            返回地点列表
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{location.name}</h1>
              <Badge variant={location.is_active ? "default" : "secondary"}>
                {location.is_active ? "启用" : "停用"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{location.address || "无地址"}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setLocationFormOpen(true)}>
          编辑地点
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as LocationDetailTab)}>
        <TabsList>
          <TabsTrigger value="services">服务 ({services.length})</TabsTrigger>
          <TabsTrigger value="resources">资源 ({resources.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <LocationServicesPanel
            tenantSlug={tenantSlug}
            locationId={parsedLocationId}
            services={services}
            resources={resources}
            onServicesChange={invalidateAll}
          />
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <LocationResourcesPanel
            tenantSlug={tenantSlug}
            locationId={parsedLocationId}
            resources={resources}
            onResourcesChange={invalidateAll}
          />
        </TabsContent>
      </Tabs>

      <CatalogLocationFormDialog
        open={locationFormOpen}
        onOpenChange={setLocationFormOpen}
        tenantSlug={tenantSlug}
        location={location}
        onSuccess={invalidateAll}
      />
    </div>
  );
}

function LocationServicesPanel({
  tenantSlug,
  locationId,
  services,
  resources,
  onServicesChange,
}: {
  tenantSlug: string;
  locationId: number;
  services: CatalogService[];
  resources: CatalogResource[];
  onServicesChange: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | "price-asc" | "price-desc">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogService | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const openCreate = () => {
    setEditingService(null);
    setFormOpen(true);
  };

  const openEdit = (service: CatalogService) => {
    setEditingService(service);
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    const scoped = filterByActive(services, activeFilter).filter((service) =>
      matchesFields(debouncedSearch, [service.name, service.description]),
    );
    return sortServices(scoped, sortKey);
  }, [services, activeFilter, debouncedSearch, sortKey]);

  const pagination = usePaginatedList(filtered, {
    pageSize: 10,
    resetKeys: [debouncedSearch, activeFilter, sortKey],
  });

  if (services.length === 0) {
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">服务</h2>
            <Button onClick={openCreate}>新增服务</Button>
          </div>
          <EmptyState
            icon={Package}
            title="暂无服务"
            description="添加服务项目后，客户才能在预约页选择并下单。"
            action={<Button onClick={openCreate}>添加第一个服务</Button>}
          />
        </div>
        <CatalogServiceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          tenantSlug={tenantSlug}
          locationId={locationId}
          service={editingService}
          resources={resources}
          onSuccess={onServicesChange}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">服务</h2>
          <Button onClick={openCreate}>新增服务</Button>
        </div>

        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜索服务名称或说明…"
          resultCount={filtered.length}
          resultLabel="项服务"
          filters={[
            {
              value: activeFilter,
              onValueChange: (value) => setActiveFilter(value as ActiveFilter),
              placeholder: "状态",
              options: ACTIVE_FILTER_OPTIONS,
            },
          ]}
          sort={{
            value: sortKey,
            onValueChange: (value) => setSortKey(value as "name" | "price-asc" | "price-desc"),
            options: [
              { value: "name", label: "按名称" },
              { value: "price-asc", label: "价格从低到高" },
              { value: "price-desc", label: "价格从高到低" },
            ],
          }}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="没有匹配的服务"
            description="试试调整筛选条件，或清除搜索。"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                重置筛选
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              {pagination.items.map((service, index) => (
                <div key={service.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {service.duration_minutes}′
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{service.name}</p>
                        {service.description ? (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        ) : null}
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          资源 {service.resource_ids.length} 个
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {formatPrice(service.price_cents, service.currency)}
                      </span>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "启用" : "停用"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                        编辑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(service)}>
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <ListPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <CatalogServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantSlug={tenantSlug}
        locationId={locationId}
        service={editingService}
        resources={resources}
        onSuccess={onServicesChange}
      />
      <CatalogServiceDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        tenantSlug={tenantSlug}
        locationId={locationId}
        service={deleteTarget}
        onSuccess={onServicesChange}
      />
    </>
  );
}

function LocationResourcesPanel({
  tenantSlug,
  locationId,
  resources,
  onResourcesChange,
}: {
  tenantSlug: string;
  locationId: number;
  resources: CatalogResource[];
  onResourcesChange: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | "name-desc">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CatalogResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogResource | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const openCreate = () => {
    setEditingResource(null);
    setFormOpen(true);
  };

  const openEdit = (resource: CatalogResource) => {
    setEditingResource(resource);
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    const scoped = filterByActive(resources, activeFilter).filter((resource) =>
      matchesFields(debouncedSearch, [resource.name]),
    );
    return [...scoped].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "zh-CN");
      return sortKey === "name" ? cmp : -cmp;
    });
  }, [resources, activeFilter, debouncedSearch, sortKey]);

  const pagination = usePaginatedList(filtered, {
    pageSize: 10,
    resetKeys: [debouncedSearch, activeFilter, sortKey],
  });

  if (resources.length === 0) {
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">资源</h2>
            <Button onClick={openCreate}>新增资源</Button>
          </div>
          <EmptyState
            icon={Package}
            title="暂无资源"
            description="在此地点下添加可预约资源，用于排班与容量管理。"
            action={<Button onClick={openCreate}>添加第一个资源</Button>}
          />
        </div>
        <CatalogResourceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          tenantSlug={tenantSlug}
          locationId={locationId}
          resource={editingResource}
          onSuccess={onResourcesChange}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">资源</h2>
          <Button onClick={openCreate}>新增资源</Button>
        </div>

        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜索资源名称…"
          resultCount={filtered.length}
          resultLabel="个资源"
          filters={[
            {
              value: activeFilter,
              onValueChange: (value) => setActiveFilter(value as ActiveFilter),
              placeholder: "状态",
              options: ACTIVE_FILTER_OPTIONS,
            },
          ]}
          sort={{
            value: sortKey,
            onValueChange: (value) => setSortKey(value as "name" | "name-desc"),
            options: [
              { value: "name", label: "名称 A→Z" },
              { value: "name-desc", label: "名称 Z→A" },
            ],
          }}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="没有匹配的资源"
            description="试试调整筛选条件，或清除搜索。"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                重置筛选
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              {pagination.items.map((resource, index) => (
                <div key={resource.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{resource.name}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={resource.is_active ? "default" : "secondary"}>
                        {resource.is_active ? "启用" : "停用"}
                      </Badge>
                      <Link
                        to={`/t/${tenantSlug}/console/catalog/locations/${locationId}/resources/${resource.id}/schedules`}
                      >
                        <Button size="sm" variant="outline">
                          <CalendarClock className="mr-1 size-3.5" />
                          排班
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => openEdit(resource)}>
                        编辑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(resource)}>
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <ListPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <CatalogResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantSlug={tenantSlug}
        locationId={locationId}
        resource={editingResource}
        onSuccess={onResourcesChange}
      />
      <CatalogResourceDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        tenantSlug={tenantSlug}
        locationId={locationId}
        resource={deleteTarget}
        onSuccess={onResourcesChange}
      />
    </>
  );
}
