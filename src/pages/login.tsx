import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { authCreateCustomerSession, authSendVerificationCode } from "@/api/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authTokensSave } from "@/lib/auth-storage";
import type { ApiError } from "@/types/api";

/** 客户 OTP 登录页。 */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () => authCreateCustomerSession({ phone, code }),
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">手机号登录</h1>
        <p className="text-sm text-muted-foreground">验证后可取号并查看排队状态。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>验证码登录</CardTitle>
          <CardDescription>输入手机号并完成短信验证。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV ? (
            <Alert>
              <AlertDescription>
                开发环境：先发送验证码，再从后端终端复制{" "}
                <code className="font-mono text-xs">code=123456</code>。
              </AlertDescription>
            </Alert>
          ) : null}
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
        </CardContent>
      </Card>
    </div>
  );
}
