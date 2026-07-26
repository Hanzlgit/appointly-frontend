import { formatISO, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { schedulingBookingCreate } from "@/api/scheduling";
import { SlotPicker } from "@/components/booking/slot-picker";
import { LocationDetail } from "@/components/catalog/location-detail";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [partySize, setPartySize] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
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
        party_size: partySize,
        location_id: selectedSlot.location_id,
        time_slot_id: selectedSlot.time_slot_id,
        start: selectedSlot.time_slot_id ? undefined : selectedSlot.start,
        end: selectedSlot.time_slot_id ? undefined : selectedSlot.end,
        resource_id: selectedSlot.resource_id,
        contact_name: contactName,
        contact_phone: contactPhone,
      });
    },
    onSuccess: () => navigate(`/t/${tenantSlug}/bookings`),
    onError: (err: ApiError) => setError(err.message),
  });

  const bookQuery = new URLSearchParams({ serviceId: String(serviceId) });
  if (selectedLocationId != null) {
    bookQuery.set("locationId", String(selectedLocationId));
  }
  const bookPath = `/t/${tenantSlug}/book?${bookQuery.toString()}`;

  if (!serviceId) {
    return <Alert>请从首页选择一项服务后再预约。</Alert>;
  }

  if (catalogQuery.isLoading || tenantQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">正在加载…</p>;
  }

  if (!service) {
    return <Alert variant="destructive">未找到对应服务。</Alert>;
  }

  if (!selectedLocation) {
    return (
      <div className="space-y-6">
        <Alert>请先从首页选择门店。</Alert>
        <Button asChild variant="outline">
          <Link to={`/t/${tenantSlug}`}>返回选择门店</Link>
        </Button>
      </div>
    );
  }

  if (!service.location_ids?.includes(selectedLocation.id)) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">「{service.name}」在 {selectedLocation.name} 不可预约。</Alert>
        <Button asChild variant="outline">
          <Link to={`/t/${tenantSlug}?locationId=${selectedLocation.id}`}>返回选择其他服务</Link>
        </Button>
      </div>
    );
  }

  if (!authIsLoggedIn()) {
    const redirect = encodeURIComponent(bookPath);
    return (
      <div className="space-y-6">
        <header className="page-header">
          <h1 className="page-title">需要登录</h1>
          <p className="page-lead">预约前请先验证手机号。</p>
        </header>
        <Button asChild>
          <Link to={`/t/${tenantSlug}/login?redirect=${redirect}`}>去登录</Link>
        </Button>
      </div>
    );
  }

  const timeZone = tenantQuery.data?.timezone;

  return (
    <div className="space-y-8">
      <header className="page-header">
        <p className="text-xs text-muted-foreground">
          {selectedLocation.name}
          {selectedLocation.address ? ` · ${selectedLocation.address}` : ""}
        </p>
        <h1 className="page-title">{service.name}</h1>
        <p className="page-lead">
          <span className="font-mono tabular-nums">{service.duration_minutes}′</span>
          {" · "}
          {formatPrice(service.price_cents, service.currency)}
        </p>
        {service.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
        ) : null}
      </header>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="section-panel">
        <div className="section-panel-header flex items-center justify-between gap-2">
          <h3 className="section-panel-title">预约门店</h3>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/t/${tenantSlug}?locationId=${selectedLocation.id}`}>换服务</Link>
          </Button>
        </div>
        <div className="section-panel-body">
          <LocationDetail location={selectedLocation} />
        </div>
      </div>

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

      <div className="section-panel">
        <div className="section-panel-header">
          <h3 className="section-panel-title">联系信息</h3>
        </div>
        <div className="section-panel-body space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party-size">人数</Label>
            <Input
              id="party-size"
              type="number"
              min={1}
              className="max-w-[8rem] font-mono tabular-nums"
              value={partySize}
              onChange={(event) => setPartySize(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-name">联系人（可选）</Label>
            <Input
              id="contact-name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">联系电话（可选）</Label>
            <Input
              id="contact-phone"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!selectedSlot || bookingMutation.isPending}
            onClick={() => bookingMutation.mutate()}
          >
            确认预约
          </Button>
        </div>
      </div>
    </div>
  );
}
