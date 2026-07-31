import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Package, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

import {
  CatalogLocationDeleteDialog,
  CatalogLocationFormDialog,
} from "@/pages/console/catalog-forms";

import { staffCatalogLocationList } from "@/api/staff-catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useConsoleSession } from "@/lib/console-session";
import { matchesFields } from "@/lib/list-filters";
import type { CatalogLocation } from "@/types/staff-api";

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "仅启用" },
  { value: "inactive", label: "仅停用" },
];

/** 服务目录概览（Admin）。 */
export function ConsoleCatalogPage() {
  const { tenantSlug } = useConsoleSession();
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ["staff-catalog-locations", tenantSlug],
    queryFn: () => staffCatalogLocationList(tenantSlug),
  });

  if (locationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (locationsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载服务目录。</AlertDescription>
      </Alert>
    );
  }

  const locations = locationsQuery.data!.locations;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">服务目录</h1>
        <p className="text-sm text-muted-foreground">从地点进入，管理各店下的服务与资源。</p>
      </div>

      <CatalogLocationsPanel
        tenantSlug={tenantSlug}
        locations={locations}
        onLocationsChange={() =>
          queryClient.invalidateQueries({ queryKey: ["staff-catalog-locations", tenantSlug] })
        }
      />
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
  onLocationsChange,
}: {
  tenantSlug: string;
  locations: CatalogLocation[];
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
              <Link
                to={`/t/${tenantSlug}/console/catalog/locations/${location.id}`}
                className="min-w-0 flex-1 rounded-md transition-colors hover:bg-muted/50 -m-2 p-2"
              >
                <p className="font-medium">{location.name}</p>
                <p className="text-sm text-muted-foreground">{location.address || "无地址"}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  服务 {location.service_count} 项 · 资源 {location.resource_count} 个
                </p>
              </Link>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? "启用" : "停用"}
                </Badge>
                <Link
                  to={`/t/${tenantSlug}/console/catalog/locations/${location.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
                >
                  管理
                  <ChevronRight className="size-4" />
                </Link>
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
