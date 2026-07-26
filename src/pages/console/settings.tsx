import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  staffBookingSettingsRetrieve,
  staffBookingSettingsUpdate,
} from "@/api/staff-catalog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    return <p className="text-sm text-muted-foreground">加载预约规则…</p>;
  }

  if (settingsQuery.isError) {
    return <Alert variant="destructive">无法加载预约规则。</Alert>;
  }

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">预约规则</h1>
        <p className="page-lead">客户预约与取消的业务限制。</p>
      </header>

      {message ? <Alert>{message}</Alert> : null}
      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="section-panel">
        <div className="section-panel-header">
          <h3 className="section-panel-title">时间与容量</h3>
        </div>
        <div className="section-panel-body grid gap-4 sm:grid-cols-2">
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
            <select
              id="confirmation-mode"
              className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              value={form.confirmation_mode}
              onChange={(e) =>
                setForm({
                  ...form,
                  confirmation_mode: e.target.value as BookingSettings["confirmation_mode"],
                })
              }
            >
              <option value="auto">自动确认</option>
              <option value="manual">人工确认</option>
            </select>
          </div>
        </div>
      </div>

      <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        保存设置
      </Button>
    </div>
  );
}
