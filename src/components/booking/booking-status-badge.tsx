import { Badge } from "@/components/ui/badge";
import { bookingStatusBadgeClass, bookingStatusLabel } from "@/lib/booking-status";
import { cn } from "@/lib/utils";

interface BookingStatusBadgeProps {
  status: string;
}

/** 展示中文预约状态的徽章。 */
export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <Badge className={cn(bookingStatusBadgeClass(status))}>{bookingStatusLabel(status)}</Badge>
  );
}
