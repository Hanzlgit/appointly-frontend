import type { CatalogPublicLocation } from "@/types/api";

interface LocationDetailProps {
  location: CatalogPublicLocation | null | undefined;
  fallback?: string;
}

/** 展示门店名称与地址。 */
export function LocationDetail({ location, fallback = "—" }: LocationDetailProps) {
  if (!location) {
    return <span className="text-sm text-muted-foreground">{fallback}</span>;
  }

  return (
    <div>
      <p className="font-medium">{location.name}</p>
      {location.address ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{location.address}</p>
      ) : null}
    </div>
  );
}

/** 单行门店摘要，用于列表副标题。 */
export function locationSummary(location: CatalogPublicLocation): string {
  return location.address ? `${location.name} · ${location.address}` : location.name;
}
