import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO, startOfDay } from "date-fns";
import { ArrowLeft, CalendarClock, SearchX } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { staffCatalogLocationResourceList, staffCatalogLocationRetrieve } from "@/api/staff-catalog";
import {
  staffScheduleRuleCreate,
  staffScheduleRuleList,
  staffScheduleRuleUpdate,
} from "@/api/staff-scheduling";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListToolbar } from "@/components/ui/list-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useConsoleSession } from "@/lib/console-session";
import { matchesFields } from "@/lib/list-filters";
import type { ApiError } from "@/types/api";
import type { ScheduleRule, ScheduleRuleCreatePayload, ScheduleRuleUpdatePayload } from "@/types/staff-api";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "周一" },
  { value: 1, label: "周二" },
  { value: 2, label: "周三" },
  { value: 3, label: "周四" },
  { value: 4, label: "周五" },
  { value: 5, label: "周六" },
  { value: 6, label: "周日" },
];

const SLOT_INTERVAL_OPTIONS = [
  { value: 15, label: "15 分钟" },
  { value: 30, label: "30 分钟" },
  { value: 45, label: "45 分钟" },
  { value: 60, label: "60 分钟" },
] as const;

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "仅启用" },
  { value: "inactive", label: "仅停用" },
];

/** 计算营业窗口分钟数。 */
function scheduleWindowMinutes(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

/** 校验营业窗口可被时段间隔整除。 */
function scheduleWindowDivisibilityError(
  startTime: string,
  endTime: string,
  slotIntervalMinutes: number,
): string | null {
  if (!startTime || !endTime) {
    return null;
  }
  const windowMinutes = scheduleWindowMinutes(startTime, endTime);
  if (windowMinutes <= 0) {
    return "结束时间必须晚于开始时间";
  }
  if (windowMinutes % slotIntervalMinutes !== 0) {
    return "营业窗口时长必须能被时段间隔整除";
  }
  return null;
}

/** 格式化星期列表为中文标签。 */
function formatDaysOfWeek(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label ?? String(day))
    .join("、");
}

/** 格式化时间为 HH:mm 展示。 */
function formatTimeLabel(timeValue: string): string {
  return timeValue.slice(0, 5);
}

function toTimeInputValue(timeValue: string): string {
  return timeValue.slice(0, 5);
}

function todayLocalDateString(): string {
  return formatISO(startOfDay(new Date()), { representation: "date" });
}

function filterByActive(rules: ScheduleRule[], filter: ActiveFilter): ScheduleRule[] {
  if (filter === "all") {
    return rules;
  }
  return rules.filter((rule) => (filter === "active" ? rule.is_active : !rule.is_active));
}

interface ScheduleRuleCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  locationId: number;
  resourceId: number;
  onSuccess: () => void;
}

/** 新建排班规则 Dialog。 */
function ScheduleRuleCreateDialog({
  open,
  onOpenChange,
  tenantSlug,
  locationId,
  resourceId,
  onSuccess,
}: ScheduleRuleCreateDialogProps) {
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState<15 | 30 | 45 | 60>(30);
  const [capacity, setCapacity] = useState("1");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDaysOfWeek([0, 1, 2, 3, 4]);
    setStartTime("09:00");
    setEndTime("18:00");
    setSlotIntervalMinutes(30);
    setCapacity("1");
    setFieldError(null);
    setApiError(null);
  }, [open]);

  const divisibilityError = scheduleWindowDivisibilityError(
    startTime,
    endTime,
    slotIntervalMinutes,
  );

  const toggleDay = (day: number, checked: boolean) => {
    setDaysOfWeek((current) => {
      if (checked) {
        return [...new Set([...current, day])].sort((a, b) => a - b);
      }
      return current.filter((value) => value !== day);
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (daysOfWeek.length === 0) {
        throw new Error("VALIDATION:days");
      }
      const parsedCapacity = Number(capacity);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
        throw new Error("VALIDATION:capacity");
      }
      const windowError = scheduleWindowDivisibilityError(
        startTime,
        endTime,
        slotIntervalMinutes,
      );
      if (windowError) {
        throw new Error(`VALIDATION:window:${windowError}`);
      }

      const payload: ScheduleRuleCreatePayload = {
        location_id: locationId,
        resource_id: resourceId,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_interval_minutes: slotIntervalMinutes,
        capacity: parsedCapacity,
      };
      return staffScheduleRuleCreate(tenantSlug, payload);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError | Error) => {
      if (err.message.startsWith("VALIDATION:")) {
        const detail = err.message.split(":").slice(2).join(":");
        if (err.message === "VALIDATION:days") {
          setFieldError("至少选择一个生效星期");
        } else if (err.message === "VALIDATION:capacity") {
          setFieldError("容量必须为大于 0 的整数");
        } else {
          setFieldError(detail || "请检查表单输入");
        }
        setApiError(null);
        return;
      }
      setFieldError(null);
      setApiError((err as ApiError).message ?? err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建排班规则</DialogTitle>
          <DialogDescription>
            设置周期营业窗口与时段间隔，系统将按规则自动生成可预约时段。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>生效星期</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEEKDAY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={daysOfWeek.includes(option.value)}
                    onCheckedChange={(checked) => toggleDay(option.value, checked === true)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-start-time">开始时间</Label>
              <Input
                id="schedule-start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-end-time">结束时间</Label>
              <Input
                id="schedule-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>时段间隔</Label>
              <Select
                value={String(slotIntervalMinutes)}
                onValueChange={(value) =>
                  setSlotIntervalMinutes(Number(value) as 15 | 30 | 45 | 60)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_INTERVAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-capacity">每时段容量</Label>
              <Input
                id="schedule-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </div>
          </div>

          {divisibilityError ? (
            <p className="text-sm text-destructive">{divisibilityError}</p>
          ) : null}
          {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          {apiError ? (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={createMutation.isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={createMutation.isPending || Boolean(divisibilityError)}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "创建中…" : "创建规则"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ScheduleRuleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  rule: ScheduleRule | null;
  onSuccess: () => void;
}

function ScheduleRuleEditDialog({
  open,
  onOpenChange,
  tenantSlug,
  rule,
  onSuccess,
}: ScheduleRuleEditDialogProps) {
  const [effectiveDate, setEffectiveDate] = useState(todayLocalDateString());
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState<15 | 30 | 45 | 60>(30);
  const [capacity, setCapacity] = useState("1");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !rule) {
      return;
    }
    setEffectiveDate(todayLocalDateString());
    setDaysOfWeek(rule.days_of_week);
    setStartTime(toTimeInputValue(rule.start_time));
    setEndTime(toTimeInputValue(rule.end_time));
    setSlotIntervalMinutes(rule.slot_interval_minutes as 15 | 30 | 45 | 60);
    setCapacity(String(rule.capacity));
    setFieldError(null);
    setApiError(null);
  }, [open, rule]);

  const divisibilityError = scheduleWindowDivisibilityError(
    startTime,
    endTime,
    slotIntervalMinutes,
  );

  const toggleDay = (day: number, checked: boolean) => {
    setDaysOfWeek((current) => {
      if (checked) {
        return [...new Set([...current, day])].sort((a, b) => a - b);
      }
      return current.filter((value) => value !== day);
    });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!rule) {
        throw new Error("无规则数据");
      }
      if (daysOfWeek.length === 0) {
        throw new Error("VALIDATION:days");
      }
      const parsedCapacity = Number(capacity);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
        throw new Error("VALIDATION:capacity");
      }
      const windowError = scheduleWindowDivisibilityError(
        startTime,
        endTime,
        slotIntervalMinutes,
      );
      if (windowError) {
        throw new Error(`VALIDATION:window:${windowError}`);
      }

      const payload: ScheduleRuleUpdatePayload = {
        effective_date: effectiveDate,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_interval_minutes: slotIntervalMinutes,
        capacity: parsedCapacity,
      };
      return staffScheduleRuleUpdate(tenantSlug, rule.id, payload);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError | Error) => {
      if (err.message.startsWith("VALIDATION:")) {
        const detail = err.message.split(":").slice(2).join(":");
        if (err.message === "VALIDATION:days") {
          setFieldError("至少选择一个生效星期");
        } else if (err.message === "VALIDATION:capacity") {
          setFieldError("容量必须为大于 0 的整数");
        } else {
          setFieldError(detail || "请检查表单输入");
        }
        setApiError(null);
        return;
      }
      setFieldError(null);
      setApiError((err as ApiError).message ?? err.message);
    },
  });

  if (!rule) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑排班规则</DialogTitle>
          <DialogDescription>
            变更从生效日期起关闭旧空闲时段并按新配置重新生成；若生效日及之后存在有效预约则无法保存。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-effective-date">生效日期</Label>
            <Input
              id="schedule-effective-date"
              type="date"
              className="max-w-xs font-mono tabular-nums"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>生效星期</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEEKDAY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={daysOfWeek.includes(option.value)}
                    onCheckedChange={(checked) => toggleDay(option.value, checked === true)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-schedule-start-time">开始时间</Label>
              <Input
                id="edit-schedule-start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-schedule-end-time">结束时间</Label>
              <Input
                id="edit-schedule-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>时段间隔</Label>
              <Select
                value={String(slotIntervalMinutes)}
                onValueChange={(value) =>
                  setSlotIntervalMinutes(Number(value) as 15 | 30 | 45 | 60)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_INTERVAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-schedule-capacity">每时段容量</Label>
              <Input
                id="edit-schedule-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </div>
          </div>

          {divisibilityError ? (
            <p className="text-sm text-destructive">{divisibilityError}</p>
          ) : null}
          {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          {apiError ? (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={updateMutation.isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={updateMutation.isPending || Boolean(divisibilityError)}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? "保存中…" : "保存变更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 资源排班规则列表页。 */
export function ConsoleResourceSchedulesPage() {
  const { tenantSlug } = useConsoleSession();
  const { locationId, resourceId } = useParams<{ locationId: string; resourceId: string }>();
  const parsedLocationId = Number(locationId);
  const parsedResourceId = Number(resourceId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null);
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const locationQuery = useQuery({
    queryKey: ["staff-catalog-location", tenantSlug, parsedLocationId],
    queryFn: () => staffCatalogLocationRetrieve(tenantSlug, parsedLocationId),
    enabled: Number.isFinite(parsedLocationId),
  });

  const resourcesQuery = useQuery({
    queryKey: ["staff-catalog-location-resources", tenantSlug, parsedLocationId],
    queryFn: () => staffCatalogLocationResourceList(tenantSlug, parsedLocationId),
    enabled: Number.isFinite(parsedLocationId),
  });

  const rulesQuery = useQuery({
    queryKey: ["staff-schedule-rules", tenantSlug, parsedResourceId],
    queryFn: () => staffScheduleRuleList(tenantSlug, parsedResourceId),
    enabled: Number.isFinite(parsedResourceId),
  });

  const invalidateRules = () => {
    queryClient.invalidateQueries({
      queryKey: ["staff-schedule-rules", tenantSlug, parsedResourceId],
    });
  };

  const toggleMutation = useMutation({
    mutationFn: async (rule: ScheduleRule) => {
      const payload: ScheduleRuleUpdatePayload = {
        effective_date: todayLocalDateString(),
        is_active: !rule.is_active,
      };
      return staffScheduleRuleUpdate(tenantSlug, rule.id, payload);
    },
    onMutate: (rule) => {
      setTogglingRuleId(rule.id);
      setToggleError(null);
    },
    onSuccess: () => {
      invalidateRules();
    },
    onError: (err: ApiError) => {
      setToggleError(err.message);
    },
    onSettled: () => {
      setTogglingRuleId(null);
    },
  });

  const resource = resourcesQuery.data?.resources.find((item) => item.id === parsedResourceId);

  const filtered = useMemo(() => {
    const rules = rulesQuery.data?.rules ?? [];
    return filterByActive(rules, activeFilter).filter((rule) =>
      matchesFields(debouncedSearch, [
        formatDaysOfWeek(rule.days_of_week),
        formatTimeLabel(rule.start_time),
        formatTimeLabel(rule.end_time),
        String(rule.slot_interval_minutes),
        String(rule.capacity),
      ]),
    );
  }, [rulesQuery.data?.rules, activeFilter, debouncedSearch]);

  const pagination = usePaginatedList(filtered, {
    pageSize: 10,
    resetKeys: [debouncedSearch, activeFilter],
  });

  if (!Number.isFinite(parsedLocationId) || !Number.isFinite(parsedResourceId)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无效的地点或资源 ID。</AlertDescription>
      </Alert>
    );
  }

  if (locationQuery.isLoading || resourcesQuery.isLoading || rulesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (
    locationQuery.isError ||
    resourcesQuery.isError ||
    rulesQuery.isError ||
    !locationQuery.data ||
    !resource
  ) {
    return (
      <Alert variant="destructive">
        <AlertDescription>无法加载排班页面。</AlertDescription>
      </Alert>
    );
  }

  const location = locationQuery.data;
  const rules = rulesQuery.data?.rules ?? [];
  const catalogPath = `/t/${tenantSlug}/console/catalog`;
  const locationPath = `${catalogPath}/locations/${parsedLocationId}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          to={locationPath}
          className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground -ml-2"
        >
          <ArrowLeft className="size-4" />
          返回地点详情
        </Link>
        <nav className="text-sm text-muted-foreground">
          <Link to={catalogPath} className="hover:text-foreground">
            服务目录
          </Link>
          <span className="mx-2">/</span>
          <Link to={locationPath} className="hover:text-foreground">
            {location.name}
          </Link>
          <span className="mx-2">/</span>
          <span>{resource.name}</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">排班</span>
        </nav>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{resource.name} · 排班</h1>
          <p className="text-sm text-muted-foreground">
            管理 {location.name} 下该资源的周期排班规则。
          </p>
        </div>
      </div>

      {rules.length === 0 ? (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">排班规则</h2>
              <Button onClick={() => setCreateOpen(true)}>新建规则</Button>
            </div>
            <EmptyState
              icon={CalendarClock}
              title="暂无排班规则"
              description="创建周期规则后，系统会自动生成可预约时段。"
              action={<Button onClick={() => setCreateOpen(true)}>添加第一条规则</Button>}
            />
          </div>
          <ScheduleRuleCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            tenantSlug={tenantSlug}
            locationId={parsedLocationId}
            resourceId={parsedResourceId}
            onSuccess={invalidateRules}
          />
        </>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">排班规则</h2>
              <Button onClick={() => setCreateOpen(true)}>新建规则</Button>
            </div>

            <ListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="搜索星期、时间、间隔或容量…"
              resultCount={filtered.length}
              resultLabel="条规则"
              filters={[
                {
                  value: activeFilter,
                  onValueChange: (value) => setActiveFilter(value as ActiveFilter),
                  placeholder: "状态",
                  options: ACTIVE_FILTER_OPTIONS,
                },
              ]}
            />

            {toggleError ? (
              <Alert variant="destructive">
                <AlertDescription>{toggleError}</AlertDescription>
              </Alert>
            ) : null}

            {filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="没有匹配的规则"
                description="试试调整筛选条件，或清除搜索。"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setActiveFilter("all");
                    }}
                  >
                    重置筛选
                  </Button>
                }
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  {pagination.items.map((rule, index) => (
                    <div key={rule.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium">{formatDaysOfWeek(rule.days_of_week)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeLabel(rule.start_time)} – {formatTimeLabel(rule.end_time)}
                            <span className="mx-2">·</span>
                            间隔 {rule.slot_interval_minutes} 分钟
                            <span className="mx-2">·</span>
                            容量 {rule.capacity}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "启用" : "停用"}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => setEditingRule(rule)}>
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={togglingRuleId === rule.id}
                            onClick={() => toggleMutation.mutate(rule)}
                          >
                            {togglingRuleId === rule.id
                              ? "处理中…"
                              : rule.is_active
                                ? "停用"
                                : "启用"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <ListPagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.setPage}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <ScheduleRuleCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            tenantSlug={tenantSlug}
            locationId={parsedLocationId}
            resourceId={parsedResourceId}
            onSuccess={invalidateRules}
          />
          <ScheduleRuleEditDialog
            open={editingRule !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingRule(null);
              }
            }}
            tenantSlug={tenantSlug}
            rule={editingRule}
            onSuccess={invalidateRules}
          />
        </>
      )}
    </div>
  );
}
