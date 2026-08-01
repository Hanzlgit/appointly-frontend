import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, SearchX, Store } from "lucide-react";

import { locationList } from "@/api/catalog";
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
import { apiErrorMessage } from "@/lib/api-error";
import { clampPage, getTotalPages } from "@/lib/pagination";

const PAGE_SIZE = 20;

/** 首页：门店列表。 */
export function HomePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const locationsQuery = useQuery({
    queryKey: ["locations", page, debouncedSearch],
    queryFn: () =>
      locationList({
        page,
        page_size: PAGE_SIZE,
        q: debouncedSearch || undefined,
      }),
  });

  const totalItems = locationsQuery.data?.total ?? 0;
  const totalPages = getTotalPages(totalItems, PAGE_SIZE);
  const safePage = clampPage(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  if (locationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (locationsQuery.isError) {
    return (
      <EmptyState
        icon={Store}
        title="暂时无法加载"
        description={apiErrorMessage(locationsQuery.error, "门店信息加载失败，请稍后重试。")}
        action={
          <Button variant="outline" onClick={() => locationsQuery.refetch()}>
            重新加载
          </Button>
        }
      />
    );
  }

  const items = locationsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">选择门店</h1>
        <p className="text-sm text-muted-foreground">选择门店，挑选理发师与服务，在线取号排队。</p>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索门店名称或地址…"
        resultCount={totalItems}
        resultLabel="家门店"
      />

      {totalItems === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={SearchX}
            title="没有匹配的门店"
            description="试试更短的关键词，或清除搜索查看全部门店。"
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                清除搜索
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Store}
            title="暂无门店"
            description="目前还没有上线门店，请稍后再来。"
          />
        )
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>门店列表</CardTitle>
            <CardDescription>点击进入，选择理发师取号。</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {items.map((location, index) => (
              <div key={location.id}>
                {index > 0 ? <Separator /> : null}
                <Link
                  to={`/locations/${location.id}`}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <LocationDetail location={location} />
                </Link>
              </div>
            ))}
            <ListPagination
              page={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
