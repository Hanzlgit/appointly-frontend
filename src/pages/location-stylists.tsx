import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Scissors, SearchX, User } from "lucide-react";

import { locationStylistList } from "@/api/catalog";
import { Badge } from "@/components/ui/badge";
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
import { stylistCanQueue, stylistQueueStatusLabel } from "@/lib/queue-display";

const PAGE_SIZE = 20;

/** 门店理发师列表页。 */
export function LocationStylistsPage() {
  const { id = "" } = useParams();
  const locationId = Number(id);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const stylistsQuery = useQuery({
    queryKey: ["location-stylists", locationId, page, debouncedSearch],
    queryFn: () =>
      locationStylistList(locationId, {
        page,
        page_size: PAGE_SIZE,
        q: debouncedSearch || undefined,
      }),
    enabled: Number.isFinite(locationId) && locationId > 0,
  });

  const totalItems = stylistsQuery.data?.total ?? 0;
  const totalPages = getTotalPages(totalItems, PAGE_SIZE);
  const safePage = clampPage(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  if (!Number.isFinite(locationId) || locationId <= 0) {
    return (
      <EmptyState
        icon={Scissors}
        title="门店不存在"
        description="请从首页重新选择门店。"
        action={<Button variant="outline" render={<Link to="/" />} />}
      />
    );
  }

  if (stylistsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (stylistsQuery.isError) {
    return (
      <EmptyState
        icon={Scissors}
        title="暂时无法加载"
        description={apiErrorMessage(stylistsQuery.error, "理发师列表加载失败，请稍后重试。")}
        action={
          <Button variant="outline" onClick={() => stylistsQuery.refetch()}>
            重新加载
          </Button>
        }
      />
    );
  }

  const items = stylistsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="sm" render={<Link to="/" />}>
          <ChevronLeft className="size-4" />
          返回
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">选择理发师</h1>
        <p className="text-sm text-muted-foreground">挑选理发师，选择服务后取号排队。</p>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索理发师名称…"
        resultCount={totalItems}
        resultLabel="位理发师"
      />

      {totalItems === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={SearchX}
            title="没有匹配的理发师"
            description="试试更短的关键词，或清除搜索查看全部理发师。"
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                清除搜索
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={User}
            title="暂无理发师"
            description="该门店还没有上线理发师，请换一家门店试试。"
            action={<Button variant="outline" render={<Link to="/" />} />}
          />
        )
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>理发师列表</CardTitle>
            <CardDescription>选择理发师，进入服务选择与取号。</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {items.map((stylist, index) => {
              const canQueue = stylistCanQueue(stylist.queue_status);
              return (
                <div key={stylist.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center gap-3 px-4 py-4">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{stylist.name}</p>
                        <Badge variant={canQueue ? "default" : "secondary"}>
                          {stylistQueueStatusLabel(stylist.queue_status)}
                        </Badge>
                      </div>
                      {stylist.ticket_prefix ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          号票前缀 {stylist.ticket_prefix}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      disabled={!canQueue}
                      render={
                        <Link to={`/locations/${locationId}/stylists/${stylist.id}`} />
                      }
                    >
                      去剪发
                    </Button>
                  </div>
                </div>
              );
            })}
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
