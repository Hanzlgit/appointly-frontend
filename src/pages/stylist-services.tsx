import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, SearchX, Sparkles } from "lucide-react";

import { stylistServiceList } from "@/api/catalog";
import { queueTicketCreate } from "@/api/queue";
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
import { useToast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiErrorMessage } from "@/lib/api-error";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { clampPage, getTotalPages } from "@/lib/pagination";
import { createIdempotencyKey, formatPrice } from "@/lib/utils";
import type { ApiError, CatalogPublicService } from "@/types/api";

const PAGE_SIZE = 20;
const ACTIVE_QUEUE_MESSAGE = "您已有进行中的排队";

/** 理发师服务列表页，点击服务取号。 */
export function StylistServicesPage() {
  const { id = "", stylistId = "" } = useParams();
  const locationId = Number(id);
  const stylistIdNum = Number(stylistId);
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const servicesQuery = useQuery({
    queryKey: ["stylist-services", stylistIdNum, page, debouncedSearch],
    queryFn: () =>
      stylistServiceList(stylistIdNum, {
        page,
        page_size: PAGE_SIZE,
        q: debouncedSearch || undefined,
      }),
    enabled: Number.isFinite(stylistIdNum) && stylistIdNum > 0,
  });

  const queueMutation = useMutation({
    mutationFn: (service: CatalogPublicService) =>
      queueTicketCreate({
        stylist_id: stylistIdNum,
        service_id: service.id,
        idempotency_key: createIdempotencyKey(),
      }),
    onSuccess: (ticket) => {
      navigate(`/queue/${ticket.id}`, { replace: true });
    },
    onError: (err: ApiError) => {
      const message = err.message || "取号失败，请稍后重试。";
      if (message.includes(ACTIVE_QUEUE_MESSAGE)) {
        toast.error(message, {
          action: {
            label: "查看我的排队",
            onClick: () => navigate("/queue"),
          },
        });
        return;
      }
      toast.error(message);
    },
  });

  const totalItems = servicesQuery.data?.total ?? 0;
  const totalPages = getTotalPages(totalItems, PAGE_SIZE);
  const safePage = clampPage(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const handleQueue = (service: CatalogPublicService) => {
    if (!authIsLoggedIn()) {
      const redirect = encodeURIComponent(
        `/locations/${locationId}/stylists/${stylistIdNum}`,
      );
      navigate(`/login?redirect=${redirect}`);
      return;
    }
    queueMutation.mutate(service);
  };

  if (!Number.isFinite(stylistIdNum) || stylistIdNum <= 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="理发师不存在"
        description="请返回重新选择理发师。"
        action={
          Number.isFinite(locationId) && locationId > 0 ? (
            <Button variant="outline" render={<Link to={`/locations/${locationId}`} />}>
              返回选理发师
            </Button>
          ) : (
            <Button variant="outline" render={<Link to="/" />}>
              返回首页
            </Button>
          )
        }
      />
    );
  }

  if (servicesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (servicesQuery.isError) {
    return (
      <EmptyState
        icon={Sparkles}
        title="暂时无法加载"
        description={apiErrorMessage(servicesQuery.error, "服务列表加载失败，请稍后重试。")}
        action={
          <Button variant="outline" onClick={() => servicesQuery.refetch()}>
            重新加载
          </Button>
        }
      />
    );
  }

  const items = servicesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              to={
                Number.isFinite(locationId) && locationId > 0
                  ? `/locations/${locationId}`
                  : "/"
              }
            />
          }
        >
          <ChevronLeft className="size-4" />
          返回
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">选择服务</h1>
        <p className="text-sm text-muted-foreground">点击服务即可取号排队。</p>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索服务名称或说明…"
        resultCount={totalItems}
        resultLabel="项服务"
      />

      {totalItems === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={SearchX}
            title="没有匹配的服务"
            description="试试更短的关键词，或清除搜索查看全部服务。"
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                清除搜索
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="暂无服务"
            description="该理发师还没有上线服务项目。"
            action={
              Number.isFinite(locationId) && locationId > 0 ? (
                <Button variant="outline" render={<Link to={`/locations/${locationId}`} />}>
                  返回选理发师
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>服务项目</CardTitle>
            <CardDescription>选择一项服务，系统将为你分配排队号。</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {items.map((service, index) => (
              <div key={service.id}>
                {index > 0 ? <Separator /> : null}
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
                      disabled={queueMutation.isPending}
                      onClick={() => handleQueue(service)}
                    >
                      取号
                    </Button>
                  </div>
                </div>
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
