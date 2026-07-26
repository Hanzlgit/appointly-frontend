import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCog, LayoutDashboard, LogOut, Package, Settings2 } from "lucide-react";

import { staffTenantMembershipRetrieve } from "@/api/staff-auth";
import { tenantContextRetrieve } from "@/api/tenant";
import { Button } from "@/components/ui/button";
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
    return <p className="p-8 text-sm text-muted-foreground">验证身份中…</p>;
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <Link to={basePath} className="text-base font-semibold tracking-tight">
              {tenantName}
            </Link>
            <p className="text-xs text-muted-foreground">控制台 · {staffRoleLabel(role)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/t/${tenantSlug}`}>客户预约页</Link>
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
      </header>

      <div className="mx-auto grid max-w-6xl gap-0 px-4 lg:grid-cols-[200px_1fr]">
        <nav className="border-b border-border py-4 lg:border-b-0 lg:border-r lg:py-6 lg:pr-6">
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0">
            {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
              const Icon = item.icon;
              const href = `${basePath}/${item.to}`;
              const isActive = location.pathname.startsWith(href);

              return (
                <Link
                  key={item.to}
                  to={href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-l-2 px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 py-6 lg:pl-8">
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
