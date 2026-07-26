import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  staffBookingSettingsRetrieve,
  staffBookingSettingsUpdate,
} from "@/api/staff-catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsoleSession } from "@/lib/console-session";
import type { ApiError } from "@/types/api";
import type { BookingSettings } from "@/types/staff-api";

/** 预约业务规则配置（Admin）。 */
export function ConsoleSettingsPage() {
  const { tenantSlug } = useConsoleSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BookingSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["staff-booking-settings", tenantSlug],
    queryFn: () => staffBookingSettingsRetrieve(tenantSlug),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form) {
        throw new Error("无配置数据");
      }
      return staffBookingSettingsUpdate(tenantSlug, {
        min_advance_minutes: form.min_advance_minutes,
        max_booking_window_days: form.max_booking_window_days,
        pending_retention_minutes: form.pending_retention_minutes,
        cancel_deadline_minutes: form.cancel_deadline_minutes,
        future_booking_limit: form.future_booking_limit,
        confirmation_mode: form.confirmation_mode,
      });
    },
    onSuccess: () => {
      setMessage("已保存");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["staff-booking-settings", tenantSlug] });
    },
    onError: (err: ApiError) => {
      setMessage(null);
      setError(err.message);
    },
  });

  if (settingsQuery.isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载预约规则。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">预约规则</h1>
        <p className="text-sm text-muted-foreground">客户预约与取消的业务限制。</p>
      </div>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>时间与容量</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="min-advance">最少提前预约（分钟）</Label>
            <Input
              id="min-advance"
              type="number"
              min={0}
              className="font-mono tabular-nums"
              value={form.min_advance_minutes}
              onChange={(e) =>
                setForm({ ...form, min_advance_minutes: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-window">最长可预约天数</Label>
            <Input
              id="max-window"
              type="number"
              min={1}
              className="font-mono tabular-nums"
              value={form.max_booking_window_days}
              onChange={(e) =>
                setForm({ ...form, max_booking_window_days: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pending-retention">待确认保留（分钟）</Label>
            <Input
              id="pending-retention"
              type="number"
              min={1}
              className="font-mono tabular-nums"
              value={form.pending_retention_minutes}
              onChange={(e) =>
                setForm({ ...form, pending_retention_minutes: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancel-deadline">取消截止（分钟，开始前）</Label>
            <Input
              id="cancel-deadline"
              type="number"
              min={0}
              className="font-mono tabular-nums"
              value={form.cancel_deadline_minutes}
              onChange={(e) =>
                setForm({ ...form, cancel_deadline_minutes: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="future-limit">每客户未来预约上限</Label>
            <Input
              id="future-limit"
              type="number"
              min={1}
              className="font-mono tabular-nums"
              value={form.future_booking_limit}
              onChange={(e) =>
                setForm({ ...form, future_booking_limit: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation-mode">确认模式</Label>
            <Select
              value={form.confirmation_mode}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  confirmation_mode: value as BookingSettings["confirmation_mode"],
                })
              }
            >
              <SelectTrigger id="confirmation-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动确认</SelectItem>
                <SelectItem value="manual">人工确认</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        保存设置
      </Button>
    </div>
  );
}
