import { CalendarDays, LogIn, LogOut } from "lucide-react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { tenantContextRetrieve } from "@/api/tenant";
import { Button } from "@/components/ui/button";
import { authIsLoggedIn, authTokensClear } from "@/lib/auth-storage";

/** 租户页面通用布局，含顶栏导航。 */
export function TenantLayout() {
  const { tenantSlug = "" } = useParams();
  const isLoggedIn = authIsLoggedIn();

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
    enabled: Boolean(tenantSlug),
  });

  const tenantName = tenantQuery.data?.name ?? tenantSlug;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <div>
            <Link to={`/t/${tenantSlug}`} className="text-base font-semibold tracking-tight">
              {tenantName}
            </Link>
            <p className="text-xs text-muted-foreground">预约</p>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/t/${tenantSlug}/bookings`}>
                <CalendarDays className="size-3.5" />
                我的预约
              </Link>
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
              <Button asChild variant="ghost" size="sm">
                <Link to={`/t/${tenantSlug}/login`}>
                  <LogIn className="size-3.5" />
                  登录
                </Link>
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
