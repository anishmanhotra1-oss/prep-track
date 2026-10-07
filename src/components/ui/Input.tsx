import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = "text", ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</label>}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-orange-200/60 dark:border-zinc-700 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9A4D] focus:border-transparent transition-all placeholder:text-text-muted/60",
            error && "border-red-400 focus:ring-red-400",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
