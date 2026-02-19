import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const ModalInput = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 pl-0.5">
                        {label}
                    </label>
                )}
                <input
                    className={cn(
                        "w-full bg-input/20 border border-input",
                        "rounded-lg px-3 py-2.5 text-xs font-medium text-foreground",
                        "outline-none transition-all duration-200",
                        "focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20",
                        "placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed",
                        error && "border-destructive focus:border-destructive focus:ring-destructive/10",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <span className="text-xs text-destructive mt-1 ml-0.5 font-medium">{error}</span>}
            </div>
        );
    }
);
ModalInput.displayName = "ModalInput";

export const ModalSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, error?: string }>(
    ({ className, label, error, children, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 pl-0.5">
                        {label}
                    </label>
                )}
                <select
                    className={cn(
                        "w-full bg-input/20 border border-input",
                        "rounded-lg px-3 py-2.5 text-xs font-medium text-foreground",
                        "outline-none transition-all duration-200",
                        "focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20",
                        "disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer",
                        error && "border-destructive focus:border-destructive focus:ring-destructive/10",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                {error && <span className="text-xs text-destructive mt-1 ml-0.5 font-medium">{error}</span>}
            </div>
        );
    }
);
ModalSelect.displayName = "ModalSelect";
