import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "sm";

const variantStyles: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover active:bg-brand-hover",
  outline: "border border-brand text-brand hover:bg-brand-soft active:bg-brand-soft",
  ghost: "text-foreground/70 hover:bg-surface active:bg-surface",
};

const sizeStyles: Record<Size, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
