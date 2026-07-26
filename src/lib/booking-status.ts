/** 预约状态中文标签，与后端 BookingStatus 一致。 */
const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  started: "已开始",
  completed: "已完成",
  no_show: "爽约",
  cancelled: "已取消",
  rescheduled: "已改期",
  expired: "已过期",
  rejected: "已拒绝",
};

/** 将预约状态码转为中文展示文案。 */
export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

/** 返回状态徽章的 Tailwind 样式类。 */
export function bookingStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "started":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "completed":
      return "border-border bg-muted text-muted-foreground";
    case "cancelled":
    case "rejected":
    case "expired":
    case "no_show":
      return "border-red-200 bg-red-50 text-red-700";
    case "rescheduled":
      return "border-violet-200 bg-violet-50 text-violet-800";
    default:
      return "";
  }
}

/** 客户是否可取消该预约。 */
export function bookingCanCancel(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

/** 客户是否可改期该预约。 */
export function bookingCanReschedule(status: string): boolean {
  return status === "pending" || status === "confirmed";
}
