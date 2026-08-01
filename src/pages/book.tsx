import { formatISO, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { schedulingBookingCreate } from "@/api/scheduling";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { findLocation } from "@/lib/catalog";
import type { BookableSlot } from "@/lib/booking-slots";
import { formatPrice } from "@/lib/utils";
import type { ApiError } from "@/types/api";

/** 预约流程页：在已选门店下挑选日期、时段并提交。 */
export function BookPage() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = Number(searchParams.get("serviceId") ?? "0");
  const locationIdFromUrl = Number(searchParams.get("locationId") ?? "0") || null;

  const [selectedDate, setSelectedDate] = useState(() =>
    formatISO(startOfDay(new Date()), { representation: "date" }),
  );
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(locationIdFromUrl);
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tenantQuery = useQuery({
    queryKey: ["tenant-context", tenantSlug],
    queryFn: () => tenantContextRetrieve(tenantSlug),
  });

  const catalogQuery = useQuery({
    queryKey: ["catalog-public", tenantSlug],
    queryFn: () => catalogPublicBrowse(tenantSlug),
  });

  const locations = catalogQuery.data?.locations ?? [];
  const service = catalogQuery.data?.services.find((item) => item.id === serviceId);
  const selectedLocation =
    selectedLocationId != null ? findLocation(locations, selectedLocationId) : undefined;

  useEffect(() => {
    if (locations.length === 0) {
      setSelectedLocationId(null);
      return;
    }
    if (locationIdFromUrl && findLocation(locations, locationIdFromUrl)) {
      setSelectedLocationId(locationIdFromUrl);
      return;
    }
    if (locations.length === 1) {
      setSelectedLocationId(locations[0]!.id);
    }
  }, [locations, locationIdFromUrl]);

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (!selectedSlot) {
        throw new Error("请选择时段");
      }

      return schedulingBookingCreate(tenantSlug, {
        service_id: serviceId,
        location_id: selectedSlot.location_id,
        time_slot_id: selectedSlot.time_slot_id,
        start: selectedSlot.time_slot_id ? undefined : selectedSlot.start,
        end: selectedSlot.time_slot_id ? undefined : selectedSlot.end,
        resource_id: selectedSlot.resource_id,
      });
    },
    onSuccess: () => navigate(`/t/${tenantSlug}/bookings?success=1`),
    onError: (err: ApiError) => setError(err.message),
  });

  const bookQuery = new URLSearchParams({ serviceId: String(serviceId) });
  if (selectedLocationId != null) {
    bookQuery.set("locationId", String(selectedLocationId));
  }
  const bookPath = `/t/${tenantSlug}/book?${bookQuery.toString()}`;

  if (!serviceId) {
    return (
      <Alert>
        <AlertDescription>请从首页选择一项服务后再预约。</AlertDescription>
      </Alert>
    );
  }

  if (catalogQuery.isLoading || tenantQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!service) {
    return (
      <Alert variant="destructive">
        <AlertDescription>未找到对应服务。</AlertDescription>
      </Alert>
    );
  }

  if (!selectedLocation) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>请先从首页选择门店。</AlertDescription>
        </Alert>
        <Button variant="outline" render={<Link to={`/t/${tenantSlug}`} />}>
          返回选择门店
        </Button>
      </div>
    );
  }

  if (service.location_id !== selectedLocation.id) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            「{service.name}」在 {selectedLocation.name} 不可预约。
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          render={<Link to={`/t/${tenantSlug}?locationId=${selectedLocation.id}`} />}
        >
          返回选择其他服务
        </Button>
      </div>
    );
  }

  if (!authIsLoggedIn()) {
    const redirect = encodeURIComponent(bookPath);
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">需要登录</h1>
          <p className="text-sm text-muted-foreground">预约前请先验证手机号。</p>
        </div>
        <Button render={<Link to={`/t/${tenantSlug}/login?redirect=${redirect}`} />}>
          去登录
        </Button>
      </div>
    );
  }

  const timeZone = tenantQuery.data?.timezone;

  return (
    <div className="space-y-6">
      <Card className="border-none bg-transparent shadow-none ring-0">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-0 pt-0">
          <div>
            <CardDescription>服务项目</CardDescription>
            <CardTitle className="text-2xl">{service.name}</CardTitle>
            <CardDescription>
              <span className="font-mono tabular-nums">{service.duration_minutes}′</span>
              {" · "}
              {formatPrice(service.price_cents, service.currency)}
            </CardDescription>
            {service.description ? (
              <CardDescription>{service.description}</CardDescription>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            render={<Link to={`/t/${tenantSlug}?locationId=${selectedLocation.id}`} />}
          >
            换服务
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <SlotPicker
        tenantSlug={tenantSlug}
        serviceId={serviceId}
        locationId={selectedLocationId}
        location={selectedLocation}
        timeZone={timeZone}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        selectedSlot={selectedSlot}
        onSelectedSlotChange={setSelectedSlot}
      />

      <Button
        className="w-full"
        disabled={!selectedSlot || bookingMutation.isPending}
        onClick={() => bookingMutation.mutate()}
      >
        确认预约
      </Button>
    </div>
  );
}
