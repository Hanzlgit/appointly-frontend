import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "default" | "destructive";
  children: React.ReactNode;
  className?: string;
}

/** 提示信息条。 */
export function Alert({ variant = "default", children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        variant === "destructive"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
