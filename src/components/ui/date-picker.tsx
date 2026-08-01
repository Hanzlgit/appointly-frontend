import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

interface DatePickerProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/** 可切换的下拉日历，值格式为 YYYY-MM-DD。 */
export function DatePicker({
  value,
  onValueChange,
  className,
  id,
  disabled = false,
}: DatePickerProps) {
  const selectedDate = useMemo(() => parseISO(`${value}T00:00:00`), [value]);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  useEffect(() => {
    setViewMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { locale: zhCN });
    const gridEnd = endOfWeek(monthEnd, { locale: zhCN });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const displayLabel = format(selectedDate, "yyyy/MM/dd");

  const handleSelectDay = (day: Date) => {
    onValueChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none select-none",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-input/30 dark:hover:bg-input/50",
          open && "border-ring ring-3 ring-ring/50",
          className,
        )}
      >
        <span className="font-mono tabular-nums">{displayLabel}</span>
        <CalendarDays className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="isolate z-50">
          <Popover.Popup
            className={cn(
              "w-[18rem] rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "origin-(--transform-origin) duration-100",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="上个月"
                onClick={() => setViewMonth((month) => addMonths(month, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <p className="text-sm font-medium tabular-nums">
                {format(viewMonth, "yyyy年 M月", { locale: zhCN })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="下个月"
                onClick={() => setViewMonth((month) => addMonths(month, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="flex h-8 items-center justify-center text-xs text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const inCurrentMonth = isSameMonth(day, viewMonth);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      !inCurrentMonth && "text-muted-foreground/50",
                      isTodayDate && !isSelected && "font-semibold text-primary",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
