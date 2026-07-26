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
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <Link to={`/t/${tenantSlug}`} className="text-lg font-semibold text-foreground">
              {tenantName}
            </Link>
            <p className="text-sm text-muted-foreground">在线预约</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/t/${tenantSlug}/bookings`}>
                <CalendarDays className="size-4" />
                我的预约
              </Link>
            </Button>
            {isLoggedIn ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  authTokensClear();
                  window.location.reload();
                }}
              >
                <LogOut className="size-4" />
                退出
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to={`/t/${tenantSlug}/login`}>
                  <LogIn className="size-4" />
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
