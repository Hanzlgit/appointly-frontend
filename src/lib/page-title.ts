const BRAND_NAME = "洗剪吹";

/** 客户端路由 → 页面名；``home`` 表示首页。 */
export function resolveCustomerPageTitle(pathname: string): string | "home" {
  if (pathname === "/" || pathname === "") {
    return "home";
  }
  if (pathname === "/login") {
    return "登录";
  }
  if (pathname.startsWith("/locations/") && pathname.includes("/stylists/")) {
    return "选择服务";
  }
  if (pathname.startsWith("/locations/")) {
    return "选择理发师";
  }
  if (pathname.startsWith("/queue")) {
    return "我的排队";
  }
  if (pathname === "/notifications") {
    return "通知";
  }
  return BRAND_NAME;
}

/** 客户端标签页标题。 */
export function formatCustomerDocumentTitle(page: string | "home"): string {
  if (page === "home") {
    return `${BRAND_NAME} · 在线取号`;
  }
  return `${page} · ${BRAND_NAME}`;
}

export { BRAND_NAME };
