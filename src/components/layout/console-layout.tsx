import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCog, LayoutDashboard, LogOut, Package, Settings2 } from "lucide-react";

import { staffTenantMembershipRetrieve } from "@/api/staff-auth";
import { tenantContextRetrieve } from "@/api/tenant";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsoleSessionProvider, useConsoleSession } from "@/lib/console-session";
import { staffAuthIsLoggedIn, staffAuthTokensClear } from "@/lib/staff-auth-storage";
import { staffIsAdmin, staffRoleLabel } from "@/lib/staff-role";
import { cn } from "@/lib/utils";
import type { TenantRole } from "@/types/staff-api";

const NAV_ITEMS = [
  { to: "dashboard", label: "看板", icon: LayoutDashboard, adminOnly: true },
  { to: "bookings", label: "预约管理", icon: CalendarCog, adminOnly: false },
  { to: "catalog", label: "服务目录", icon: Package, adminOnly: true },
  { to: "settings", label: "预约规则", icon: Settings2, adminOnly: true },
] as const;

/** 控制台路由守卫：校验员工登录与租户成员身份。 */
export function ConsoleAuthGuard() {
  const { tenantSlug = "" } = useParams();
  const location = useLocation();

  if (!staffAuthIsLoggedIn()) {
    return (
      <Navigate to={`/t/${tenantSlug}/console/login`} replace state={{ from: location.pathname }} />
    );
  }

  const membershipQuery = useQuery({
    queryKey: ["staff-membership", tenantSlug],
    queryFn: () => staffTenantMembershipRetrieve(tenantSlug),
    retry: false,
  });

  if (membershipQuery.isLoading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (membershipQuery.isError) {
    staffAuthTokensClear();
    return <Navigate to={`/t/${tenantSlug}/console/login`} replace />;
  }

  return (
    <ConsoleSessionProvider value={{ tenantSlug, role: membershipQuery.data!.role }}>
      <ConsoleLayout role={membershipQuery.data!.role} />
    </ConsoleSessionProvider>
  );
}

interface ConsoleLayoutProps {
  role: TenantRole;
}

/** 员工/管理端控制台布局。 */
function ConsoleLayout({ role }: ConsoleLayoutProps) {
  const { tenantSlug = "" } = useParams();
  const location = useLocation();
  const isAdmin = staffIsAdmin(role);

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
  });

  const tenantName = tenantQuery.data?.name ?? tenantSlug;
  const basePath = `/t/${tenantSlug}/console`;

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <Link to={basePath} className="text-base font-semibold tracking-tight">
              {tenantName}
            </Link>
            <p className="text-xs text-muted-foreground">控制台 · {staffRoleLabel(role)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" render={<Link to={`/t/${tenantSlug}`} />}>
              客户预约页
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                staffAuthTokensClear();
                window.location.href = `/t/${tenantSlug}/console/login`;
              }}
            >
              <LogOut className="size-3.5" />
              退出
            </Button>
          </div>
        </div>
        <Separator />
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const Icon = item.icon;
            const href = `${basePath}/${item.to}`;
            const isActive = location.pathname.startsWith(href);

            return (
              <Button
                key={item.to}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn("shrink-0 justify-start lg:w-full")}
                render={<Link to={href} />}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** 仅管理员可访问的路由守卫。 */
export function ConsoleAdminGuard() {
  const { tenantSlug, role } = useConsoleSession();

  if (!staffIsAdmin(role)) {
    return <Navigate to={`/t/${tenantSlug}/console/bookings`} replace />;
  }

  return <Outlet />;
}
