import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationList, notificationMarkRead } from "@/api/notifications";
import { tenantContextRetrieve } from "@/api/tenant";
import { NotificationListItem } from "@/components/notification/notification-list-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { formatUnreadBadgeCount } from "@/lib/notification-display";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api";

const POLL_INTERVAL_MS = 60_000;
const PREVIEW_PAGE_SIZE = 5;

/** 顶栏通知铃铛与下拉预览。 */
export function NotificationBell() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = authIsLoggedIn();

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
    enabled: Boolean(tenantSlug) && isLoggedIn,
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread", tenantSlug],
    queryFn: () =>
      notificationList(tenantSlug, { page: 1, page_size: 1 }),
    enabled: Boolean(tenantSlug) && isLoggedIn,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const previewQuery = useQuery({
    queryKey: ["notifications-preview", tenantSlug],
    queryFn: () =>
      notificationList(tenantSlug, { page: 1, page_size: PREVIEW_PAGE_SIZE }),
    enabled: Boolean(tenantSlug) && isLoggedIn && open,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      notificationMarkRead(tenantSlug, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["notifications-preview", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["notifications", tenantSlug] });
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!isLoggedIn) {
    return null;
  }

  const unreadCount = unreadQuery.data?.unread_count ?? 0;
  const badgeLabel = formatUnreadBadgeCount(unreadCount);
  const previewItems = previewQuery.data?.items ?? [];
  const timeZone = tenantQuery.data?.timezone;

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.read_at == null) {
      await markReadMutation.mutateAsync(notification.id);
    }
    setOpen(false);
    if (notification.booking_id != null) {
      navigate(`/t/${tenantSlug}/bookings?highlight=${notification.booking_id}`);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        aria-label={unreadCount > 0 ? `通知，${unreadCount} 条未读` : "通知"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative"
      >
        <Bell className="size-3.5" />
        通知
        {badgeLabel ? (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex min-w-[1.1rem] items-center justify-center",
              "rounded-full bg-primary px-1 text-[10px] font-medium leading-4 text-primary-foreground",
            )}
          >
            {badgeLabel}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-medium">通知</p>
            {unreadCount > 0 ? (
              <span className="text-xs text-muted-foreground">{unreadCount} 条未读</span>
            ) : null}
          </div>
          <Separator />
          {previewQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : previewItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">暂无通知</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {previewItems.map((notification, index) => (
                <div key={notification.id}>
                  {index > 0 ? <Separator /> : null}
                  <NotificationListItem
                    notification={notification}
                    tenantSlug={tenantSlug}
                    timeZone={timeZone}
                    compact
                    onNavigate={handleNotificationClick}
                  />
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              render={<Link to={`/t/${tenantSlug}/notifications`} onClick={() => setOpen(false)} />}
            >
              查看全部通知
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
