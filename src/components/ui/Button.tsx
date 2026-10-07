import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "tint";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium btn-pill focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9A4D] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variants = {
      primary: "bg-[#FF9A4D] hover:bg-[#FF8A33] text-white shadow-md shadow-orange-500/20 active:scale-95",
      secondary:
        "bg-white/90 dark:bg-zinc-800/90 text-text-primary border border-orange-200/60 dark:border-zinc-700 hover:bg-orange-50 dark:hover:bg-zinc-700 shadow-sm",
      destructive:
        "bg-transparent text-red-500 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30",
      tint: "bg-[#FFE9D6] dark:bg-[#3D2516] text-[#B85A12] dark:text-[#FFB885] hover:bg-orange-200/60",
      ghost: "bg-transparent text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-5 py-2.5 text-sm gap-2",
      lg: "px-7 py-3.5 text-base gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
