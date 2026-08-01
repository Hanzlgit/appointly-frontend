import { CalendarDays, LogIn, LogOut } from "lucide-react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { tenantContextRetrieve } from "@/api/tenant";
import { NotificationBell } from "@/components/notification/notification-bell";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { authIsLoggedIn, authTokensClear } from "@/lib/auth-storage";
import {
  formatCustomerDocumentTitle,
  resolveCustomerPageTitle,
} from "@/lib/page-title";

/** 租户页面通用布局，含顶栏导航。 */
export function TenantLayout() {
  const { tenantSlug = "" } = useParams();
  const { pathname } = useLocation();
  const isLoggedIn = authIsLoggedIn();

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
    enabled: Boolean(tenantSlug),
  });

  const tenantName = tenantQuery.data?.name ?? tenantSlug;
  const page = resolveCustomerPageTitle(pathname, tenantSlug);
  useDocumentTitle(formatCustomerDocumentTitle(page, tenantName));

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 shrink-0">
            <Link to={`/t/${tenantSlug}`} className="text-base font-semibold tracking-tight">
              {tenantName}
            </Link>
            <p className="text-xs text-muted-foreground">在线预约</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" render={<Link to={`/t/${tenantSlug}/bookings`} />}>
              <CalendarDays className="size-3.5" />
              我的预约
            </Button>
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  authTokensClear();
                  window.location.reload();
                }}
              >
                <LogOut className="size-3.5" />
                退出
              </Button>
            ) : (
              <Button variant="ghost" size="sm" render={<Link to={`/t/${tenantSlug}/login`} />}>
                <LogIn className="size-3.5" />
                登录
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
