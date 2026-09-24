import { forwardRef, type ButtonHTMLAttributes } from "react";

// `accent*` is for claiming an offer and nothing else — see globals.css.
// Prefer `accent-outline` for it: on the offers feed every card carries a Claim
// button, and filled ones stack into a wall of terracotta that undoes the whole
// point of reserving the colour. Filled accent stays for small marks only.
type Variant = "primary" | "accent" | "accent-outline" | "outline" | "ghost";
type Size = "md" | "sm";

const variantStyles: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover active:bg-brand-hover",
  accent: "bg-accent text-accent-foreground shadow-sm hover:bg-accent-hover active:bg-accent-hover",
  "accent-outline": "border border-accent bg-accent-soft/40 text-accent hover:bg-accent-soft active:bg-accent-soft",
  outline: "border border-brand text-brand hover:bg-brand-soft active:bg-brand-soft",
  ghost: "text-muted hover:bg-surface active:bg-surface",
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
