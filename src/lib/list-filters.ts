/** 文本是否匹配查询（大小写不敏感，多词 AND）。 */
export function matchesQuery(text: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const haystack = text.toLowerCase();
  return normalized.split(/\s+/).every((term) => haystack.includes(term));
}

/** 合并多个字段后做文本匹配。 */
export function matchesFields(query: string, fields: Array<string | number | null | undefined>): boolean {
  const combined = fields
    .filter((field) => field != null && field !== "")
    .map(String)
    .join(" ");
  return matchesQuery(combined, query);
}

export type ServiceSortKey = "name" | "price-asc" | "price-desc" | "duration-asc" | "duration-desc";

/** 服务列表排序。 */
export function sortServices<T extends { name: string; price_cents: number; duration_minutes: number }>(
  items: T[],
  sortKey: ServiceSortKey,
): T[] {
  const sorted = [...items];
  switch (sortKey) {
    case "price-asc":
      return sorted.sort((a, b) => a.price_cents - b.price_cents);
    case "price-desc":
      return sorted.sort((a, b) => b.price_cents - a.price_cents);
    case "duration-asc":
      return sorted.sort((a, b) => a.duration_minutes - b.duration_minutes);
    case "duration-desc":
      return sorted.sort((a, b) => b.duration_minutes - a.duration_minutes);
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }
}
