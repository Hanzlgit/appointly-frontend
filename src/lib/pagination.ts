/** 对数组做客户端分页切片。 */
export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) {
    return items;
  }
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** 根据条目数计算总页数（至少 1 页）。 */
export function getTotalPages(totalItems: number, pageSize: number): number {
  if (pageSize <= 0 || totalItems <= 0) {
    return 1;
  }
  return Math.ceil(totalItems / pageSize);
}

/** 将页码限制在有效范围内。 */
export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }
  return Math.min(Math.max(page, 1), totalPages);
}
