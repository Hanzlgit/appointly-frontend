import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { staffAuthCreateSession } from "@/api/staff-auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { staffAuthIsLoggedIn } from "@/lib/staff-auth-storage";
import type { ApiError } from "@/types/api";

/** 员工/管理员登录页。 */
export function ConsoleLoginPage() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? `/t/${tenantSlug}/console`;

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (staffAuthIsLoggedIn()) {
    return <Navigate to={redirectTo} replace />;
  }

  const loginMutation = useMutation({
    mutationFn: () => staffAuthCreateSession({ login, password }),
    onSuccess: () => navigate(redirectTo, { replace: true }),
    onError: (err: ApiError) => setError(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">控制台登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            租户 <span className="font-mono">{tenantSlug}</span>
          </p>
        </header>

        <div className="section-panel">
          <div className="section-panel-body space-y-4">
            {error ? <Alert variant="destructive">{error}</Alert> : null}

            <div className="space-y-2">
              <Label htmlFor="staff-login">用户名</Label>
              <Input
                id="staff-login"
                autoComplete="username"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password">密码</Label>
              <Input
                id="staff-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button
              className="w-full"
              disabled={!login || !password || loginMutation.isPending}
              onClick={() => loginMutation.mutate()}
            >
              登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
