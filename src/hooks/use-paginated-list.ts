import { useEffect, useMemo, useState } from "react";

import { clampPage, getTotalPages, paginateItems } from "@/lib/pagination";

interface UsePaginatedListOptions {
  pageSize?: number;
  /** 变化时重置到第 1 页（如搜索词、筛选条件）。 */
  resetKeys?: readonly unknown[];
}

/** 客户端列表分页：过滤/排序后的数组 + 页码状态。 */
export function usePaginatedList<T>(items: T[], options: UsePaginatedListOptions = {}) {
  const pageSize = options.pageSize ?? 10;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [options.resetKeys]);

  const totalItems = items.length;
  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = clampPage(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const paginatedItems = useMemo(
    () => paginateItems(items, safePage, pageSize),
    [items, safePage, pageSize],
  );

  return {
    items: paginatedItems,
    page: safePage,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    hasPagination: totalItems > pageSize,
  };
}
