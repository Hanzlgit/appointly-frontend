import { staffApiClient } from "@/lib/staff-api-client";
import type {
  BookingSettings,
  CatalogLocation,
  CatalogLocationList,
  CatalogResource,
  CatalogResourceList,
  CatalogService,
  CatalogServiceList,
} from "@/types/staff-api";

/** 列出地点（Admin）。 */
export function staffCatalogLocationList(tenantSlug: string) {
  return staffApiClient.get<CatalogLocationList>(`/api/v1/${tenantSlug}/catalog/locations/`);
}

export function staffCatalogLocationCreate(
  tenantSlug: string,
  payload: Pick<CatalogLocation, "name" | "address"> & { resource_ids?: number[] },
) {
  return staffApiClient.post<CatalogLocation>(`/api/v1/${tenantSlug}/catalog/locations/`, payload);
}

export function staffCatalogLocationUpdate(
  tenantSlug: string,
  locationId: number,
  payload: Partial<Pick<CatalogLocation, "name" | "address" | "is_active" | "resource_ids">>,
) {
  return staffApiClient.patch<CatalogLocation>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/`,
    payload,
  );
}

export function staffCatalogLocationDelete(tenantSlug: string, locationId: number) {
  return staffApiClient.delete(`/api/v1/${tenantSlug}/catalog/locations/${locationId}/`);
}

/** 列出服务（Admin）。 */
export function staffCatalogServiceList(tenantSlug: string) {
  return staffApiClient.get<CatalogServiceList>(`/api/v1/${tenantSlug}/catalog/services/`);
}

export function staffCatalogServiceCreate(
  tenantSlug: string,
  payload: Pick<
    CatalogService,
    "name" | "description" | "duration_minutes" | "price_cents" | "currency"
  > & { resource_ids?: number[] },
) {
  return staffApiClient.post<CatalogService>(`/api/v1/${tenantSlug}/catalog/services/`, payload);
}

export function staffCatalogServiceUpdate(
  tenantSlug: string,
  serviceId: number,
  payload: Partial<
    Pick<
      CatalogService,
      | "name"
      | "description"
      | "duration_minutes"
      | "price_cents"
      | "currency"
      | "is_active"
      | "resource_ids"
    >
  >,
) {
  return staffApiClient.patch<CatalogService>(
    `/api/v1/${tenantSlug}/catalog/services/${serviceId}/`,
    payload,
  );
}

export function staffCatalogServiceDelete(tenantSlug: string, serviceId: number) {
  return staffApiClient.delete(`/api/v1/${tenantSlug}/catalog/services/${serviceId}/`);
}

/** 列出资源（Admin）。 */
export function staffCatalogResourceList(tenantSlug: string) {
  return staffApiClient.get<CatalogResourceList>(`/api/v1/${tenantSlug}/catalog/resources/`);
}

export function staffCatalogResourceCreate(
  tenantSlug: string,
  payload: Pick<CatalogResource, "name" | "resource_type"> & {
    staff_user_id?: number | null;
    location_ids?: number[];
  },
) {
  return staffApiClient.post<CatalogResource>(`/api/v1/${tenantSlug}/catalog/resources/`, payload);
}

export function staffCatalogResourceUpdate(
  tenantSlug: string,
  resourceId: number,
  payload: Partial<
    Pick<CatalogResource, "name" | "resource_type" | "staff_user_id" | "is_active" | "location_ids">
  >,
) {
  return staffApiClient.patch<CatalogResource>(
    `/api/v1/${tenantSlug}/catalog/resources/${resourceId}/`,
    payload,
  );
}

export function staffCatalogResourceDelete(tenantSlug: string, resourceId: number) {
  return staffApiClient.delete(`/api/v1/${tenantSlug}/catalog/resources/${resourceId}/`);
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
