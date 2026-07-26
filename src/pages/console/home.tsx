import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { staffTenantMembershipRetrieve } from "@/api/staff-auth";
import { staffIsAdmin } from "@/lib/staff-role";

/** 控制台首页：管理员进看板，员工进预约管理。 */
export function ConsoleHomePage() {
  const { tenantSlug = "" } = useParams();

  const membershipQuery = useQuery({
    queryKey: ["staff-membership", tenantSlug],
    queryFn: () => staffTenantMembershipRetrieve(tenantSlug),
  });

  if (membershipQuery.isLoading) {
    return <p className="text-muted-foreground">加载中…</p>;
  }

  if (staffIsAdmin(membershipQuery.data?.role)) {
    return <Navigate to={`/t/${tenantSlug}/console/dashboard`} replace />;
  }

  return <Navigate to={`/t/${tenantSlug}/console/bookings`} replace />;
}
