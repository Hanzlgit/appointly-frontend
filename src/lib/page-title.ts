const DEFAULT_TITLE = "在线预约";

/** 客户端路由 → 页面名；``home`` 表示租户首页。 */
export function resolveCustomerPageTitle(pathname: string, tenantSlug: string): string | "home" {
  const base = `/t/${tenantSlug}`;
  if (pathname === base || pathname === `${base}/`) {
    return "home";
  }
  if (pathname.endsWith("/login")) {
    return "登录";
  }
  if (pathname.endsWith("/book")) {
    return "预约";
  }
  if (pathname.endsWith("/bookings")) {
    return "我的预约";
  }
  if (pathname.endsWith("/notifications")) {
    return "通知";
  }
  return DEFAULT_TITLE;
}

/** 控制台路由 → 页面名。 */
export function resolveConsolePageTitle(pathname: string, tenantSlug: string): string {
  const base = `/t/${tenantSlug}/console`;
  if (pathname === base || pathname === `${base}/`) {
    return "控制台";
  }
  if (pathname.endsWith("/login")) {
    return "员工登录";
  }
  if (pathname.includes("/resources/") && pathname.endsWith("/schedules")) {
    return "排班";
  }
  if (pathname.includes("/catalog/locations/")) {
    return "地点详情";
  }
  if (pathname.endsWith("/dashboard")) {
    return "看板";
  }
  if (pathname.endsWith("/bookings")) {
    return "预约管理";
  }
  if (pathname.endsWith("/catalog")) {
    return "服务目录";
  }
  if (pathname.endsWith("/settings")) {
    return "预约规则";
  }
  return "控制台";
}

/** 客户端标签页标题。 */
export function formatCustomerDocumentTitle(page: string | "home", tenantName: string): string {
  if (page === "home") {
    return `${tenantName} · 在线预约`;
  }
  return `${page} · ${tenantName}`;
}

/** 控制台标签页标题。 */
export function formatConsoleDocumentTitle(page: string, tenantName: string): string {
  return `${page} · ${tenantName} 管理`;
}

export { DEFAULT_TITLE };
