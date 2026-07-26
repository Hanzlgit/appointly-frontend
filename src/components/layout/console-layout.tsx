import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCog,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
} from "lucide-react";

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
    return <p className="p-8 text-muted-foreground">验证身份中…</p>;
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
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link to={basePath} className="text-lg font-semibold">
              {tenantName}
            </Link>
            <p className="text-sm text-muted-foreground">
              管理控制台 · {staffRoleLabel(role)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/t/${tenantSlug}`}>客户预约页</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                staffAuthTokensClear();
                window.location.href = `/t/${tenantSlug}/console/login`;
              }}
            >
              <LogOut className="size-4" />
              退出
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const Icon = item.icon;
            const href = `${basePath}/${item.to}`;
            const isActive = location.pathname.startsWith(href);

            return (
              <Link
                key={item.to}
                to={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
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
