import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { catalogPublicBrowse } from "@/api/tenant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findLocation } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { CatalogPublicLocation } from "@/types/api";

function locationAddressLabel(location: CatalogPublicLocation) {
  return location.address.trim() || location.name;
}

/** 顶栏门店选择（显示地址，位于租户名右侧）。 */
export function TenantLocationBar({ className }: { className?: string }) {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
    enabled: Boolean(tenantSlug),
  });

  const locations = catalogQuery.data?.locations ?? [];
  const locationIdParam = searchParams.get("locationId");
  const selectedLocationId = locationIdParam ? Number(locationIdParam) : null;
  const selectedLocation =
    selectedLocationId != null ? findLocation(locations, selectedLocationId) : undefined;

  if (catalogQuery.isLoading || locations.length === 0) {
    return null;
  }

  const handleSelectLocation = (id: number) => {
    if (pathname.includes("/book")) {
      const params = new URLSearchParams(searchParams);
      params.set("locationId", String(id));
      navigate(`${pathname}?${params.toString()}`);
      return;
    }
    setSearchParams({ locationId: String(id) });
  };

  const selectValue =
    selectedLocation != null
      ? String(selectedLocation.id)
      : locations.length === 1
        ? String(locations[0]!.id)
        : undefined;

  const locationItems = locations.map((location) => ({
    value: String(location.id),
    label: locationAddressLabel(location),
  }));

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <Select
        value={selectValue}
        items={locationItems}
        onValueChange={(value) => value && handleSelectLocation(Number(value))}
      >
        <SelectTrigger className="h-8 w-full max-w-md truncate">
          <SelectValue placeholder="请选择门店地址" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location.id} value={String(location.id)}>
              {locationAddressLabel(location)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
