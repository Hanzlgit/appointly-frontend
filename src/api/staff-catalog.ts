import { staffApiClient } from "@/lib/staff-api-client";
import type {
  BookingSettings,
  CatalogLocationList,
  CatalogResourceList,
  CatalogServiceList,
} from "@/types/staff-api";

/** 列出地点（Admin）。 */
export function staffCatalogLocationList(tenantSlug: string) {
  return staffApiClient.get<CatalogLocationList>(`/api/v1/${tenantSlug}/catalog/locations/`);
}

/** 列出服务（Admin）。 */
export function staffCatalogServiceList(tenantSlug: string) {
  return staffApiClient.get<CatalogServiceList>(`/api/v1/${tenantSlug}/catalog/services/`);
}

/** 列出资源（Admin）。 */
export function staffCatalogResourceList(tenantSlug: string) {
  return staffApiClient.get<CatalogResourceList>(`/api/v1/${tenantSlug}/catalog/resources/`);
}

/** 获取预约规则（Admin）。 */
export function staffBookingSettingsRetrieve(tenantSlug: string) {
  return staffApiClient.get<BookingSettings>(
    `/api/v1/${tenantSlug}/scheduling/booking-settings/`,
  );
}

/** 更新预约规则（Admin）。 */
export function staffBookingSettingsUpdate(
  tenantSlug: string,
  payload: Partial<
    Pick<
      BookingSettings,
      | "min_advance_minutes"
      | "max_booking_window_days"
      | "pending_retention_minutes"
      | "cancel_deadline_minutes"
      | "future_booking_limit"
      | "confirmation_mode"
    >
  >,
) {
  return staffApiClient.patch<BookingSettings>(
    `/api/v1/${tenantSlug}/scheduling/booking-settings/`,
    payload,
  );
}
