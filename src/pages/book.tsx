import { addDays, formatISO, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { catalogPublicBrowse, tenantContextRetrieve } from "@/api/tenant";
import { schedulingAvailabilityQuery, schedulingBookingCreate } from "@/api/scheduling";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authIsLoggedIn } from "@/lib/auth-storage";
import { formatDateTime } from "@/lib/utils";
import type { ApiError, AvailabilityResult } from "@/types/api";

interface BookableSlot {
  key: string;
  start: string;
  end: string;
  remaining_capacity: number;
  location_id: number;
  time_slot_id?: number;
  resource_id?: number;
}

/** 将可用性查询结果统一为可预约时段列表。 */
function availabilityToBookableSlots(result: AvailabilityResult): BookableSlot[] {
  if (result.mode === "resource") {
    return result.slots.map((slot) => ({
      key: `resource-${slot.time_slot_id}`,
      start: slot.start,
      end: slot.end,
      remaining_capacity: slot.remaining_capacity,
      location_id: slot.location_id,
      time_slot_id: slot.time_slot_id,
      resource_id: slot.resource_id,
    }));
  }

  return result.availability.map((item) => ({
    key: `aggregate-${item.service_id}-${item.location_id}-${item.start}`,
    start: item.start,
    end: item.end,
    remaining_capacity: item.remaining_capacity,
    location_id: item.location_id,
  }));
}

/** 过滤已开始的时段，只保留未来可预约项。 */
function filterUpcomingSlots(slots: BookableSlot[]): BookableSlot[] {
  const now = Date.now();
  return slots.filter((slot) => new Date(slot.start).getTime() > now);
}

/** 预约流程页：选日期、时段并提交。 */
export function BookPage() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = Number(searchParams.get("serviceId") ?? "0");

  const [selectedDate, setSelectedDate] = useState(() =>
    formatISO(startOfDay(new Date()), { representation: "date" }),
  );
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

  const service = catalogQuery.data?.services.find((item) => item.id === serviceId);

  const availabilityRange = useMemo(() => {
    const start = startOfDay(new Date(`${selectedDate}T00:00:00`));
    const end = addDays(start, 1);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [selectedDate]);

  const availabilityQuery = useQuery({
    queryKey: ["availability", tenantSlug, serviceId, selectedDate],
    queryFn: () =>
      schedulingAvailabilityQuery(tenantSlug, {
        ...availabilityRange,
        service_id: serviceId,
      }),
    enabled: serviceId > 0,
  });

  const slots = filterUpcomingSlots(
    availabilityQuery.data ? availabilityToBookableSlots(availabilityQuery.data) : [],
  );

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

      <Card>
        <CardHeader>
          <CardTitle>选择日期</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setSelectedSlot(null);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>可用时段</CardTitle>
          <CardDescription>点击选择合适的时间。</CardDescription>
        </CardHeader>
        <CardContent>
          {availabilityQuery.isLoading ? (
            <p className="text-muted-foreground">查询可用时段中…</p>
          ) : slots.length === 0 ? (
            <Alert>
              该日期暂无可用时段。若选的是今天，可能时段已过，请尝试选择明天或之后的日期。
            </Alert>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.key === slot.key;
                return (
                  <Button
                    key={slot.key}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {formatDateTime(slot.start, timeZone)} · 余 {slot.remaining_capacity}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
