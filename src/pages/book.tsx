import { formatISO, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { schedulingBookingCreate } from "@/api/scheduling";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authIsLoggedIn } from "@/lib/auth-storage";
import type { BookableSlot } from "@/lib/booking-slots";
import type { ApiError } from "@/types/api";

/** 预约流程页：选地点、日期、时段并提交。 */
export function BookPage() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = Number(searchParams.get("serviceId") ?? "0");

  const [selectedDate, setSelectedDate] = useState(() =>
    formatISO(startOfDay(new Date()), { representation: "date" }),
  );
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
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
  const hasMultipleLocations = locations.length > 1;

  useEffect(() => {
    if (locations.length === 0) {
      setSelectedLocationId(null);
      return;
    }
    setSelectedLocationId((current) => {
      if (current != null && locations.some((location) => location.id === current)) {
        return current;
      }
      return locations[0]?.id ?? null;
    });
  }, [locations]);

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

  if (!serviceId) {
    return <Alert>请从首页选择一项服务后再预约。</Alert>;
  }

  if (catalogQuery.isLoading || tenantQuery.isLoading) {
    return <p className="text-muted-foreground">加载中…</p>;
  }

  if (!service) {
    return <Alert variant="destructive">未找到对应服务。</Alert>;
  }

  if (!authIsLoggedIn()) {
    const redirect = encodeURIComponent(`/t/${tenantSlug}/book?serviceId=${serviceId}`);
    return (
      <Card>
        <CardHeader>
          <CardTitle>需要登录</CardTitle>
          <CardDescription>预约前请先验证手机号。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={`/t/${tenantSlug}/login?redirect=${redirect}`}>去登录</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const timeZone = tenantQuery.data?.timezone;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">预约 {service.name}</h1>
        <p className="text-muted-foreground">时长 {service.duration_minutes} 分钟</p>
      </section>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {hasMultipleLocations ? (
        <Card>
          <CardHeader>
            <CardTitle>选择地点</CardTitle>
            <CardDescription>该服务在多个地点提供，请先选择预约地点。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {locations.map((location) => {
                const isSelected = selectedLocationId === location.id;
                return (
                  <Button
                    key={location.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className="h-auto justify-start px-4 py-3 text-left"
                    onClick={() => {
                      setSelectedLocationId(location.id);
                      setSelectedSlot(null);
                    }}
                  >
                    <span className="font-medium">{location.name}</span>
                    {location.address ? (
                      <span className="mt-0.5 block text-xs opacity-80">{location.address}</span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SlotPicker
        tenantSlug={tenantSlug}
        serviceId={serviceId}
        locationId={selectedLocationId}
        timeZone={timeZone}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        selectedSlot={selectedSlot}
        onSelectedSlotChange={setSelectedSlot}
      />

      <Card>
        <CardHeader>
          <CardTitle>预约信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party-size">人数</Label>
            <Input
              id="party-size"
              type="number"
              min={1}
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
        </CardContent>
      </Card>
    </div>
  );
}
