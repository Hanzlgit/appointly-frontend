import type { TenantRole } from "@/types/staff-api";

/** 角色中文展示。 */
export function staffRoleLabel(role: TenantRole): string {
  switch (role) {
    case "tenant_admin":
      return "管理员";
    case "staff":
      return "员工";
    default:
      return role;
  }
}

/** 是否为租户管理员。 */
export function staffIsAdmin(role: TenantRole | undefined): boolean {
  return role === "tenant_admin";
}
