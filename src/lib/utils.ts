import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名，后者覆盖前者冲突项。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 生成幂等键，用于创建预约等写操作。 */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** 将 ISO 时间格式化为本地可读字符串。 */
export function formatDateTime(value: string, timeZone?: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** 将分转为带货币符号的价格文案。 */
export function formatPrice(priceCents: number, currency: string): string {
  const amount = priceCents / 100;
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** 预约时段：开始日期时间 + 结束时刻。 */
export function formatBookingWhen(start: string, end: string, timeZone?: string): string {
  const startLabel = formatDateTime(start, timeZone);
  const endLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(end));
  return `${startLabel} — ${endLabel}`;
}
