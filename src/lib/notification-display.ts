const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  "queue.ticket.created": "已取号",
  "queue.ticket.called": "已叫号",
  "queue.ticket.requeued": "重新排队",
  "queue.ticket.cancelled": "已取消",
  "queue.ticket.completed": "已完成",
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
