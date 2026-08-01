const QUEUE_STATUS_LABELS: Record<string, string> = {
  waiting: "排队中",
  called: "已叫号",
  serving: "服务中",
  completed: "已完成",
  cancelled: "已取消",
};

const STYLIST_QUEUE_STATUS_LABELS: Record<string, string> = {
  open: "接单中",
  paused: "暂停接单",
  closed: "已打烊",
};

/** 排队号状态中文标签。 */
export function queueTicketStatusLabel(status: string): string {
  return QUEUE_STATUS_LABELS[status] ?? status;
}

/** 排队号是否仍可取消。 */
export function queueTicketCanCancel(status: string): boolean {
  return status === "waiting";
}

/** 排队号是否处于活跃状态。 */
export function queueTicketIsActive(status: string): boolean {
  return status === "waiting" || status === "called" || status === "serving";
}

/** 理发师接单状态中文标签。 */
export function stylistQueueStatusLabel(status: string): string {
  return STYLIST_QUEUE_STATUS_LABELS[status] ?? status;
}

/** 理发师是否可取号。 */
export function stylistCanQueue(status: string): boolean {
  return status === "open";
}
