import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, ListOrdered, MapPin, Scissors, User } from "lucide-react";

import { queueTicketCancel, queueTicketGet, queueTicketMine } from "@/api/queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api-error";
import { authIsLoggedIn } from "@/lib/auth-storage";
import {
  queueTicketCanCancel,
  queueTicketIsActive,
  queueTicketStatusLabel,
} from "@/lib/queue-display";
import { formatPrice } from "@/lib/utils";
import type { ApiError, QueueTicket } from "@/types/api";

const POLL_INTERVAL_MS = 15_000;

function TicketDetail({ ticket }: { ticket: QueueTicket }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isActive = queueTicketIsActive(ticket.status);
  const canCancel = queueTicketCanCancel(ticket.status);

  const cancelMutation = useMutation({
    mutationFn: () => queueTicketCancel(ticket.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["queue-ticket", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["queue-ticket-mine"] });
    },
    onError: (err: ApiError) => window.alert(err.message),
  });

  return (
    <Card>
      <CardHeader className="text-center">
        <CardDescription>{ticket.location_name}</CardDescription>
        <CardTitle className="font-mono text-5xl tracking-wider">{ticket.ticket_display}</CardTitle>
        <div className="flex justify-center pt-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {queueTicketStatusLabel(ticket.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ticket.status === "waiting" ? (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{ticket.ahead_count}</p>
              <p className="text-xs text-muted-foreground">前面等待</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{ticket.estimated_wait_minutes}</p>
              <p className="text-xs text-muted-foreground">预计等待（分钟）</p>
            </div>
          </div>
        ) : ticket.status === "called" ? (
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <p className="font-medium text-primary">请前往 {ticket.stylist_name} 处</p>
            <p className="mt-1 text-sm text-muted-foreground">你的号已被叫，请尽快到店。</p>
          </div>
        ) : null}

        <Separator />

        <dl className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">理发师</dt>
              <dd className="font-medium">{ticket.stylist_name}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Scissors className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">服务</dt>
              <dd className="font-medium">
                {ticket.service_name}
                <span className="ml-2 font-mono text-muted-foreground">
                  {ticket.service_duration_minutes}′ ·{" "}
                  {formatPrice(ticket.service_price_cents, "CNY")}
                </span>
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">门店</dt>
              <dd className="font-medium">{ticket.location_name}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">取号时间</dt>
              <dd className="font-medium">
                {new Intl.DateTimeFormat("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(ticket.created_at))}
              </dd>
            </div>
          </div>
        </dl>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          {canCancel ? (
            <Button
              variant="outline"
              className="flex-1"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (window.confirm("确定取消排队吗？")) {
                  cancelMutation.mutate();
                }
              }}
            >
              取消排队
            </Button>
          ) : null}
          {!isActive ? (
            <Button className="flex-1" render={<Link to="/" />}>
              再去取号
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              返回首页
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 排队状态页：/queue 显示当前排队号，/queue/:ticketId 显示指定号。 */
export function QueueStatusPage() {
  const { ticketId } = useParams();
  const ticketIdNum = ticketId ? Number(ticketId) : null;

  const mineQuery = useQuery({
    queryKey: ["queue-ticket-mine"],
    queryFn: queueTicketMine,
    enabled: authIsLoggedIn() && ticketIdNum == null,
    refetchInterval: (query) => {
      const ticket = query.state.data;
      if (ticket && queueTicketIsActive(ticket.status)) {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  const detailQuery = useQuery({
    queryKey: ["queue-ticket", ticketIdNum],
    queryFn: () => queueTicketGet(ticketIdNum!),
    enabled: authIsLoggedIn() && ticketIdNum != null && Number.isFinite(ticketIdNum),
    refetchInterval: (query) => {
      const ticket = query.state.data;
      if (ticket && queueTicketIsActive(ticket.status)) {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  if (!authIsLoggedIn()) {
    const redirect = encodeURIComponent(ticketId ? `/queue/${ticketId}` : "/queue");
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">需要登录</h1>
          <p className="text-sm text-muted-foreground">登录后可查看排队状态。</p>
        </div>
        <Button render={<Link to={`/login?redirect=${redirect}`} />}>去登录</Button>
      </div>
    );
  }

  const activeQuery = ticketIdNum != null ? detailQuery : mineQuery;

  if (activeQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-16 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (activeQuery.isError) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="无法加载排队信息"
        description={apiErrorMessage(activeQuery.error, "排队信息加载失败，请稍后重试。")}
        action={
          <Button variant="outline" onClick={() => activeQuery.refetch()}>
            重新加载
          </Button>
        }
      />
    );
  }

  const ticket = activeQuery.data;

  if (!ticket) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">我的排队</h1>
          <p className="text-sm text-muted-foreground">当前没有进行中的排队号。</p>
        </div>
        <EmptyState
          icon={ListOrdered}
          title="暂无排队"
          description="选择门店、理发师与服务，即可在线取号。"
          action={<Button render={<Link to="/" />} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">我的排队</h1>
        <p className="text-sm text-muted-foreground">排队状态会自动刷新。</p>
      </div>
      <TicketDetail ticket={ticket} />
    </div>
  );
}
