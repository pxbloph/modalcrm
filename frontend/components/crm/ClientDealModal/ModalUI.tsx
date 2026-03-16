import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export interface ModalSelectOption {
    label: string;
    value: string;
}

interface ModalSelectProps {
    label?: string;
    error?: string;
    className?: string;
    value?: string;
    placeholder?: string;
    options: ModalSelectOption[];
    disabled?: boolean;
    onValueChange?: (value: string) => void;
}

export function ModalSelect({
    className,
    label,
    error,
    value,
    placeholder = "Selecione...",
    options,
    disabled,
    onValueChange
}: ModalSelectProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 pl-0.5">
                    {label}
                </label>
            )}
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger
                    className={cn(
                        "w-full bg-input/20 border border-input",
                        "rounded-lg px-3 py-2.5 text-xs font-medium text-foreground",
                        "outline-none transition-all duration-200",
                        "focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        error && "border-destructive focus:border-destructive focus:ring-destructive/10",
                        className
                    )}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <span className="text-xs text-destructive mt-1 ml-0.5 font-medium">{error}</span>}
        </div>
    );
}

