import { apiClient } from "@/lib/api-client";
import type {
  PaginatedLocationList,
  PaginatedServiceList,
  PaginatedStylistList,
} from "@/types/api";

export interface CatalogListParams {
  page?: number;
  page_size?: number;
  q?: string;
}

function buildQuery(params: CatalogListParams = {}): string {
  const search = new URLSearchParams();
  if (params.page != null) {
    search.set("page", String(params.page));
  }
  if (params.page_size != null) {
    search.set("page_size", String(params.page_size));
  }
  if (params.q) {
    search.set("q", params.q);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** 分页列出门店。 */
export function locationList(params: CatalogListParams = {}) {
  return apiClient.get<PaginatedLocationList>(`/api/v1/locations/${buildQuery(params)}`, {
    auth: false,
  });
}

/** 分页列出指定门店的理发师。 */
export function locationStylistList(locationId: number, params: CatalogListParams = {}) {
  return apiClient.get<PaginatedStylistList>(
    `/api/v1/locations/${locationId}/stylists/${buildQuery(params)}`,
    { auth: false },
  );
}

/** 分页列出指定理发师的服务项目。 */
export function stylistServiceList(stylistId: number, params: CatalogListParams = {}) {
  return apiClient.get<PaginatedServiceList>(
    `/api/v1/stylists/${stylistId}/services/${buildQuery(params)}`,
    { auth: false },
  );
}
