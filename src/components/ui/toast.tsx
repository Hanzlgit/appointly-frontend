import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: "default" | "error";
  action?: ToastAction;
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  variant: "default" | "error";
  action?: ToastAction;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: Omit<ToastOptions, "variant">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 全局 Toast 容器，固定在右上角，不挤占页面布局。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++nextId.current;
      const variant = options.variant ?? "default";
      setToasts((current) => [...current, { id, message, variant, action: options.action }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? 5000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      error: (message, options) => show(message, { ...options, variant: "error" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                "pointer-events-auto rounded-xl border bg-popover p-4 text-sm shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 slide-in-from-top-2",
                toast.variant === "error" && "border-destructive/30 bg-destructive/5",
              )}
            >
              <div className="flex items-start gap-3">
                <p
                  className={cn(
                    "min-w-0 flex-1 leading-relaxed",
                    toast.variant === "error" && "text-destructive",
                  )}
                >
                  {toast.message}
                </p>
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="关闭"
                  onClick={() => dismiss(toast.id)}
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              {toast.action ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant={toast.variant === "error" ? "destructive" : "default"}
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/** 触发右上角 Toast。 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast 必须在 ToastProvider 内使用");
  }
  return context;
}
