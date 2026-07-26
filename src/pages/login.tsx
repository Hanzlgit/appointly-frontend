import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { authCreateCustomerSession, authSendVerificationCode } from "@/api/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authTokensSave } from "@/lib/auth-storage";
import type { ApiError } from "@/types/api";

/** 客户 OTP 登录页。 */
export function LoginPage() {
  const { tenantSlug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? `/t/${tenantSlug}`;

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () =>
      authCreateCustomerSession({
        phone,
        code,
        tenant_slug: tenantSlug,
      }),
    onSuccess: (tokens) => {
      authTokensSave(tokens);
      navigate(redirectTo, { replace: true });
    },
    onError: (err: ApiError) => setError(err.message),
  });

  const sendCodeMutation = useMutation({
    mutationFn: () => authSendVerificationCode(phone),
    onSuccess: () => {
      setError(null);
      setMessage(
        import.meta.env.DEV
          ? "验证码已发送。请在运行后端的终端里查找 mock_sms_send 日志中的 code= 字段。"
          : "验证码已发送，请查收短信。",
      );
    },
    onError: (err: ApiError) => setError(err.message),
  });

  return (
    <div className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">手机号登录</h1>
        <p className="page-lead">验证后可预约并查看订单。</p>
      </header>

      <div className="section-panel">
        <div className="section-panel-body space-y-4">
          {import.meta.env.DEV ? (
            <Alert>
              开发环境：先发送验证码，再从后端终端复制{" "}
              <code className="font-mono text-xs">code=123456</code>。
            </Alert>
          ) : null}
          {message ? <Alert>{message}</Alert> : null}
          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              inputMode="numeric"
              placeholder="13900139000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                inputMode="numeric"
                placeholder="6 位验证码"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!phone || sendCodeMutation.isPending}
                onClick={() => sendCodeMutation.mutate()}
              >
                发送
              </Button>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!phone || !code || loginMutation.isPending}
            onClick={() => loginMutation.mutate()}
          >
            登录
          </Button>
        </div>
      </div>
    </div>
  );
}
