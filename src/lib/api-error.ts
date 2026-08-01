import type { ApiError } from "@/types/api";

/** 将 API / 网络错误转为用户可读文案。 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return "无法连接服务器。请确认后端已启动：在 appointly 目录运行 uv run python manage.py runserver 18000";
  }

  if (error instanceof Error) {
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      return "请求的资源不存在。";
    }
    if (apiError.status >= 502) {
      return "后端服务不可用。请确认 Django 已在 18000 端口启动。";
    }
    if (error.message) {
      return error.message;
    }
  }

  return fallback;
}
