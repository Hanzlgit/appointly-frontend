import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, SearchX } from "lucide-react";

import {
  CatalogLocationDeleteDialog,
  CatalogLocationFormDialog,
  CatalogResourceDeleteDialog,
  CatalogResourceFormDialog,
  CatalogServiceDeleteDialog,
  CatalogServiceFormDialog,
} from "@/pages/console/catalog-forms";

import {
  staffCatalogLocationList,
  staffCatalogResourceList,
  staffCatalogServiceList,
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
import type { CatalogLocation, CatalogResource, CatalogService } from "@/types/staff-api";

type ActiveFilter = "all" | "active" | "inactive";
type CatalogTab = "locations" | "services" | "resources";

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "仅启用" },
  { value: "inactive", label: "仅停用" },
];

/** 服务目录概览（Admin）。 */
export function ConsoleCatalogPage() {
  const { tenantSlug } = useConsoleSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CatalogTab>("locations");

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
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载服务目录。</AlertDescription>
      </Alert>
    );
  }

  const locations = locationsQuery.data!.locations;
  const services = servicesQuery.data!.services;
  const resources = resourcesQuery.data!.resources;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">服务目录</h1>
        <p className="text-sm text-muted-foreground">地点、服务与资源的当前配置。</p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as CatalogTab)}>
        <TabsList>
          <TabsTrigger value="locations">地点 ({locations.length})</TabsTrigger>
          <TabsTrigger value="services">服务 ({services.length})</TabsTrigger>
          <TabsTrigger value="resources">资源 ({resources.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-4">
          <CatalogLocationsPanel
            tenantSlug={tenantSlug}
            locations={locations}
            resources={resources}
            onLocationsChange={() =>
              queryClient.invalidateQueries({ queryKey: ["staff-catalog-locations", tenantSlug] })
            }
          />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <CatalogServicesPanel
            tenantSlug={tenantSlug}
            services={services}
            resources={resources}
            onServicesChange={() =>
              queryClient.invalidateQueries({ queryKey: ["staff-catalog-services", tenantSlug] })
            }
          />
        </TabsContent>
        <TabsContent value="resources" className="mt-4">
          <CatalogResourcesPanel
            tenantSlug={tenantSlug}
            resources={resources}
            locations={locations}
            onResourcesChange={() =>
              queryClient.invalidateQueries({ queryKey: ["staff-catalog-resources", tenantSlug] })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function filterByActive<T extends { is_active: boolean }>(items: T[], filter: ActiveFilter): T[] {
  if (filter === "all") {
    return items;
  }
  return items.filter((item) => (filter === "active" ? item.is_active : !item.is_active));
}

function CatalogLocationsPanel({
  tenantSlug,
  locations,
  resources,
  onLocationsChange,
}: {
  tenantSlug: string;
  locations: CatalogLocation[];
  resources: CatalogResource[];
  onLocationsChange: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | "name-desc">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CatalogLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogLocation | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const openCreate = () => {
    setEditingLocation(null);
    setFormOpen(true);
  };

  const openEdit = (location: CatalogLocation) => {
    setEditingLocation(location);
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    const scoped = filterByActive(locations, activeFilter).filter((location) =>
      matchesFields(debouncedSearch, [location.name, location.address]),
    );
    return [...scoped].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "zh-CN");
      return sortKey === "name" ? cmp : -cmp;
    });
  }, [locations, activeFilter, debouncedSearch, sortKey]);

  const pagination = usePaginatedList(filtered, {
    pageSize: 10,
    resetKeys: [debouncedSearch, activeFilter, sortKey],
  });

  return (
    <>
      <CatalogListShell
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索地点名称或地址…"
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        sortKey={sortKey}
        onSortKeyChange={(value) => setSortKey(value as "name" | "name-desc")}
        totalCount={filtered.length}
        resultLabel="个地点"
        isEmptySource={locations.length === 0}
        emptyTitle="暂无地点"
        emptyDescription="添加第一个服务地点，客户才能在预约页选择门店。"
        emptyActionLabel="添加第一个地点"
        addButtonLabel="新增地点"
        onAdd={openCreate}
        noMatchTitle="没有匹配的地点"
      >
        {pagination.items.map((location, index) => (
          <div key={location.id}>
            {index > 0 ? <Separator /> : null}
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{location.name}</p>
                <p className="text-sm text-muted-foreground">{location.address || "无地址"}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  资源 {location.resource_ids.length} 个
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? "启用" : "停用"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openEdit(location)}>
                  编辑
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(location)}>
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
      </CatalogListShell>

      <CatalogLocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantSlug={tenantSlug}
        location={editingLocation}
        resources={resources}
        onSuccess={onLocationsChange}
      />
      <CatalogLocationDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        tenantSlug={tenantSlug}
        location={deleteTarget}
        onSuccess={onLocationsChange}
      />
    </>
  );
}

function CatalogServicesPanel({
  tenantSlug,
  services,
  resources,
  onServicesChange,
}: {
  tenantSlug: string;
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

  return (
    <>
      <CatalogListShell
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索服务名称或说明…"
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        sortKey={sortKey}
        onSortKeyChange={(value) => setSortKey(value as "name" | "price-asc" | "price-desc")}
        sortOptions={[
          { value: "name", label: "按名称" },
          { value: "price-asc", label: "价格从低到高" },
          { value: "price-desc", label: "价格从高到低" },
        ]}
        totalCount={filtered.length}
        resultLabel="项服务"
        isEmptySource={services.length === 0}
        emptyTitle="暂无服务"
        emptyDescription="添加服务项目后，客户才能在预约页选择并下单。"
        emptyActionLabel="添加第一个服务"
        addButtonLabel="新增服务"
        onAdd={openCreate}
        noMatchTitle="没有匹配的服务"
      >
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
      </CatalogListShell>

      <CatalogServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantSlug={tenantSlug}
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
        service={deleteTarget}
        onSuccess={onServicesChange}
      />
    </>
  );
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  staff: "工作人员",
  room: "房间",
  venue: "场地",
  equipment: "设备",
};

function CatalogResourcesPanel({
  tenantSlug,
  resources,
  locations,
  onResourcesChange,
}: {
  tenantSlug: string;
  resources: CatalogResource[];
  locations: CatalogLocation[];
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

  const locationName = (id: number) => locations.find((l) => l.id === id)?.name ?? String(id);
  const resourceTypeLabel = (type: string) => RESOURCE_TYPE_LABELS[type] ?? type;

  const filtered = useMemo(() => {
    const scoped = filterByActive(resources, activeFilter).filter((resource) =>
      matchesFields(debouncedSearch, [
        resource.name,
        resource.resource_type,
        ...resource.location_ids.map(locationName),
      ]),
    );
    return [...scoped].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "zh-CN");
      return sortKey === "name" ? cmp : -cmp;
    });
  }, [resources, activeFilter, debouncedSearch, sortKey, locations]);

  const pagination = usePaginatedList(filtered, {
    pageSize: 10,
    resetKeys: [debouncedSearch, activeFilter, sortKey],
  });

  return (
    <>
      <CatalogListShell
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索资源名称或类型…"
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        sortKey={sortKey}
        onSortKeyChange={(value) => setSortKey(value as "name" | "name-desc")}
        totalCount={filtered.length}
        resultLabel="个资源"
        isEmptySource={resources.length === 0}
        emptyTitle="暂无资源"
        emptyDescription="添加可预约资源（工作人员、房间、场地或设备），用于排班与容量管理。"
        emptyActionLabel="添加第一个资源"
        addButtonLabel="新增资源"
        onAdd={openCreate}
        noMatchTitle="没有匹配的资源"
      >
        {pagination.items.map((resource, index) => (
          <div key={resource.id}>
            {index > 0 ? <Separator /> : null}
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{resource.name}</p>
                <p className="text-sm text-muted-foreground">
                  类型 {resourceTypeLabel(resource.resource_type)} · 地点{" "}
                  {resource.location_ids.map(locationName).join("、") || "—"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant={resource.is_active ? "default" : "secondary"}>
                  {resource.is_active ? "启用" : "停用"}
                </Badge>
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
      </CatalogListShell>

      <CatalogResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantSlug={tenantSlug}
        resource={editingResource}
        locations={locations}
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
        resource={deleteTarget}
        onSuccess={onResourcesChange}
      />
    </>
  );
}

function CatalogListShell({
  search,
  onSearchChange,
  searchPlaceholder,
  activeFilter,
  onActiveFilterChange,
  sortKey,
  onSortKeyChange,
  sortOptions = [
    { value: "name", label: "名称 A→Z" },
    { value: "name-desc", label: "名称 Z→A" },
  ],
  totalCount,
  resultLabel,
  isEmptySource,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  addButtonLabel,
  onAdd,
  noMatchTitle,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  activeFilter: ActiveFilter;
  onActiveFilterChange: (value: ActiveFilter) => void;
  sortKey: string;
  onSortKeyChange: (value: string) => void;
  sortOptions?: Array<{ value: string; label: string }>;
  totalCount: number;
  resultLabel: string;
  isEmptySource: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  addButtonLabel?: string;
  onAdd?: () => void;
  noMatchTitle: string;
  children: React.ReactNode;
}) {
  if (isEmptySource) {
    return (
      <div className="space-y-4">
        {onAdd && addButtonLabel ? (
          <div className="flex justify-end">
            <Button onClick={onAdd}>{addButtonLabel}</Button>
          </div>
        ) : null}
        <EmptyState
          icon={Package}
          title={emptyTitle}
          description={emptyDescription}
          action={
            onAdd && emptyActionLabel ? (
              <Button onClick={onAdd}>{emptyActionLabel}</Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onAdd && addButtonLabel ? (
        <div className="flex justify-end">
          <Button onClick={onAdd}>{addButtonLabel}</Button>
        </div>
      ) : null}
      <ListToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        resultCount={totalCount}
        resultLabel={resultLabel}
        filters={[
          {
            value: activeFilter,
            onValueChange: (value) => onActiveFilterChange(value as ActiveFilter),
            placeholder: "状态",
            options: ACTIVE_FILTER_OPTIONS,
          },
        ]}
        sort={{
          value: sortKey,
          onValueChange: onSortKeyChange,
          options: sortOptions,
        }}
      />

      {totalCount === 0 ? (
        <EmptyState
          icon={SearchX}
          title={noMatchTitle}
          description="试试调整筛选条件，或清除搜索。"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onActiveFilterChange("all");
              }}
            >
              重置筛选
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">{children}</CardContent>
        </Card>
      )}
    </div>
  );
}
