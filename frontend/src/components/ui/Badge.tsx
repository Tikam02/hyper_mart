import type { ReactNode } from "react";

type Variant = "success" | "brand" | "neutral" | "danger";

const variantStyles: Record<Variant, string> = {
  success: "bg-success-soft text-success",
  brand: "bg-brand text-brand-foreground",
  neutral: "border border-border bg-surface text-foreground/60",
  danger: "bg-red-100 text-danger",
};

export function Badge({
  variant = "neutral",
  className = "",
  children,
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
