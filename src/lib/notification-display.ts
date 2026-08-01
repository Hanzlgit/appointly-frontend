const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  "booking.created": "待确认",
  "booking.confirmed": "已确认",
  "booking.cancelled": "已取消",
  "booking.rescheduled": "已改期",
  "booking.reminder": "提醒",
};

/** 通知类型的中文标签。 */
export function notificationTypeLabel(notificationType: string): string {
  return NOTIFICATION_TYPE_LABELS[notificationType] ?? "通知";
}

export const NOTIFICATION_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "全部类型" },
  ...Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

/** 通知是否未读。 */
export function notificationIsUnread(notification: { read_at: string | null }): boolean {
  return notification.read_at == null;
}

/** 格式化未读角标文案（超过 99 显示 99+）。 */
export function formatUnreadBadgeCount(count: number): string {
  if (count <= 0) {
    return "";
  }
  return count > 99 ? "99+" : String(count);
}
