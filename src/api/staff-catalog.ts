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

export function staffCatalogLocationRetrieve(tenantSlug: string, locationId: number) {
  return staffApiClient.get<CatalogLocation>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/`,
  );
}

export function staffCatalogLocationCreate(
  tenantSlug: string,
  payload: Pick<CatalogLocation, "name" | "address">,
) {
  return staffApiClient.post<CatalogLocation>(`/api/v1/${tenantSlug}/catalog/locations/`, payload);
}

export function staffCatalogLocationUpdate(
  tenantSlug: string,
  locationId: number,
  payload: Partial<Pick<CatalogLocation, "name" | "address" | "is_active">>,
) {
  return staffApiClient.patch<CatalogLocation>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/`,
    payload,
  );
}

export function staffCatalogLocationDelete(tenantSlug: string, locationId: number) {
  return staffApiClient.delete(`/api/v1/${tenantSlug}/catalog/locations/${locationId}/`);
}

/** 列出指定地点下的资源（Admin）。 */
export function staffCatalogLocationResourceList(tenantSlug: string, locationId: number) {
  return staffApiClient.get<CatalogResourceList>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/resources/`,
  );
}

export function staffCatalogLocationResourceCreate(
  tenantSlug: string,
  locationId: number,
  payload: Pick<CatalogResource, "name">,
) {
  return staffApiClient.post<CatalogResource>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/resources/`,
    payload,
  );
}

export function staffCatalogLocationResourceUpdate(
  tenantSlug: string,
  locationId: number,
  resourceId: number,
  payload: Partial<Pick<CatalogResource, "name" | "is_active">>,
) {
  return staffApiClient.patch<CatalogResource>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/resources/${resourceId}/`,
    payload,
  );
}

export function staffCatalogLocationResourceDelete(
  tenantSlug: string,
  locationId: number,
  resourceId: number,
) {
  return staffApiClient.delete(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/resources/${resourceId}/`,
  );
}

/** 列出指定地点下的服务（Admin）。 */
export function staffCatalogLocationServiceList(tenantSlug: string, locationId: number) {
  return staffApiClient.get<CatalogServiceList>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/services/`,
  );
}

export function staffCatalogLocationServiceCreate(
  tenantSlug: string,
  locationId: number,
  payload: Pick<
    CatalogService,
    "name" | "description" | "duration_minutes" | "price_cents" | "currency"
  > & { resource_ids?: number[] },
) {
  return staffApiClient.post<CatalogService>(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/services/`,
    payload,
  );
}

export function staffCatalogLocationServiceUpdate(
  tenantSlug: string,
  locationId: number,
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
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/services/${serviceId}/`,
    payload,
  );
}

export function staffCatalogLocationServiceDelete(
  tenantSlug: string,
  locationId: number,
  serviceId: number,
) {
  return staffApiClient.delete(
    `/api/v1/${tenantSlug}/catalog/locations/${locationId}/services/${serviceId}/`,
  );
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
