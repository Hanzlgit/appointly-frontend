import type { CatalogPublicLocation, CatalogPublicService } from "@/types/api";

/** 列出在指定门店可预约的服务。 */
export function servicesForLocation(
  services: CatalogPublicService[],
  locationId: number,
): CatalogPublicService[] {
  return services.filter((service) => service.location_id === locationId);
}

/** 按 ID 查找门店。 */
export function findLocation(
  locations: CatalogPublicLocation[],
  locationId: number,
): CatalogPublicLocation | undefined {
  return locations.find((location) => location.id === locationId);
}

/** 统计各门店可预约的服务数量。 */
export function serviceCountByLocation(
  services: CatalogPublicService[],
  locationId: number,
): number {
  return servicesForLocation(services, locationId).length;
}
