import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, SearchX } from "lucide-react";

import { notificationList, notificationMarkRead, notificationReadAll } from "@/api/notifications";
import { tenantContextRetrieve } from "@/api/tenant";
import { NotificationListItem } from "@/components/notification/notification-list-item";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { NOTIFICATION_TYPE_FILTER_OPTIONS } from "@/lib/notification-display";
import { clampPage, getTotalPages } from "@/lib/pagination";
import type { ApiError, Notification } from "@/types/api";

const PAGE_SIZE = 10;

/** 客户站内通知列表页。 */
export function NotificationsPage() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, readFilter, typeFilter]);

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", tenantSlug, page, debouncedSearch, readFilter, typeFilter],
    queryFn: () =>
      notificationList(tenantSlug, {
        page,
        page_size: PAGE_SIZE,
        q: debouncedSearch || undefined,
        unread_only: readFilter === "unread",
        type: typeFilter === "all" ? undefined : typeFilter,
      }),
    enabled: authIsLoggedIn(),
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      notificationMarkRead(tenantSlug, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["notifications-preview", tenantSlug] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationReadAll(tenantSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["notifications-preview", tenantSlug] });
    },
    onError: (err: ApiError) => window.alert(err.message),
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.read_at == null) {
      await markReadMutation.mutateAsync(notification.id);
    }
    if (notification.booking_id != null) {
      navigate(`/t/${tenantSlug}/bookings?highlight=${notification.booking_id}`);
    }
  };

  const totalItems = notificationsQuery.data?.total ?? 0;
  const totalPages = getTotalPages(totalItems, PAGE_SIZE);
  const safePage = clampPage(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  if (!authIsLoggedIn()) {
    const redirect = encodeURIComponent(`/t/${tenantSlug}/notifications`);
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">需要登录</h1>
          <p className="text-sm text-muted-foreground">登录后可查看通知。</p>
        </div>
        <Button render={<Link to={`/t/${tenantSlug}/login?redirect=${redirect}`} />}>
          去登录
        </Button>
      </div>
    );
  }

  if (notificationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载通知列表，请稍后重试。</AlertDescription>
      </Alert>
    );
  }

  const result = notificationsQuery.data;
  const items = result?.items ?? [];
  const unreadCount = result?.unread_count ?? 0;
  const timeZone = tenantQuery.data?.timezone;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">通知</h1>
          <p className="text-sm text-muted-foreground">
            预约确认、取消、改期与提醒消息。
            {unreadCount > 0 ? ` 当前 ${unreadCount} 条未读。` : null}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={readAllMutation.isPending}
            onClick={() => readAllMutation.mutate()}
          >
            全部已读
          </Button>
        ) : null}
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索标题或内容…"
        resultCount={totalItems}
        resultLabel="条通知"
        filters={[
          {
            value: readFilter,
            onValueChange: setReadFilter,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "unread", label: "仅未读" },
            ],
          },
          {
            value: typeFilter,
            onValueChange: setTypeFilter,
            placeholder: "类型",
            options: NOTIFICATION_TYPE_FILTER_OPTIONS,
            className: "w-[7.5rem]",
          },
        ]}
      />

      {totalItems === 0 ? (
        debouncedSearch || readFilter !== "all" || typeFilter !== "all" ? (
          <EmptyState
            icon={SearchX}
            title="没有匹配的通知"
            description="试试调整筛选条件，或清除搜索查看全部记录。"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setReadFilter("all");
                  setTypeFilter("all");
                }}
              >
                重置筛选
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Bell}
            title="暂无通知"
            description="预约相关的消息会显示在这里。"
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            {items.map((notification, index) => (
              <div key={notification.id}>
                {index > 0 ? <Separator /> : null}
                <NotificationListItem
                  notification={notification}
                  tenantSlug={tenantSlug}
                  timeZone={timeZone}
                  onNavigate={handleNotificationClick}
                />
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
