import { Link } from "react-router-dom";

import { cn, formatDateTime } from "@/lib/utils";
import { notificationIsUnread, notificationTypeLabel } from "@/lib/notification-display";
import type { Notification } from "@/types/api";

interface NotificationListItemProps {
  notification: Notification;
  compact?: boolean;
  onNavigate?: (notification: Notification) => void;
  className?: string;
}

/** 单条站内通知展示。 */
export function NotificationListItem({
  notification,
  compact = false,
  onNavigate,
  className,
}: NotificationListItemProps) {
  const unread = notificationIsUnread(notification);
  const queueHref =
    notification.queue_ticket_id != null
      ? `/queue/${notification.queue_ticket_id}`
      : null;

  const content = (
    <>
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            unread ? "bg-primary" : "bg-transparent",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("leading-snug", unread ? "font-semibold" : "font-normal")}>
              {notification.title}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {notificationTypeLabel(notification.notification_type)}
            </span>
          </div>
          {!compact ? (
            <p className="text-sm text-muted-foreground">{notification.body}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {formatDateTime(notification.created_at)}
          </p>
        </div>
      </div>
    </>
  );

  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(notification)}
        className={cn(
          "block w-full px-4 py-3 text-left transition-colors hover:bg-muted/60",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  if (queueHref) {
    return (
      <Link
        to={queueHref}
        className={cn("block px-4 py-3 transition-colors hover:bg-muted/60", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("px-4 py-3", className)}>{content}</div>;
}
