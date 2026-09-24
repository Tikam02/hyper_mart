import type { ReactNode } from "react";

// `accent` is the discount/savings badge and is the only variant that should
// carry the warm accent — see the role split in globals.css.
type Variant = "success" | "brand" | "accent" | "neutral" | "danger";

const variantStyles: Record<Variant, string> = {
  success: "bg-success-soft text-success-soft-foreground",
  brand: "bg-brand-soft text-brand-soft-foreground",
  accent: "bg-accent text-accent-foreground",
  neutral: "border border-border bg-surface text-muted",
  danger: "bg-danger-soft text-danger-soft-foreground",
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
