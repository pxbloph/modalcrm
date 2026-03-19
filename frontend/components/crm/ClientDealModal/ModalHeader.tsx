import React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalHeaderProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    tags?: any[];
    integrationStatus?: string;
}

export function ModalHeader({ title, subtitle, onClose, integrationStatus }: ModalHeaderProps) {
    return (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex justify-between items-start bg-card sticky top-0 z-20">
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-tight truncate">
                        {title || "Novo Cadastro"}
                    </h2>
                    {subtitle && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                            {subtitle}
                        </span>
                    )}
                    {integrationStatus && (
                        <span className={cn(
                            "text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded uppercase shrink-0",
                            integrationStatus === "Cadastro salvo com sucesso!"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        )}>
                            {integrationStatus}
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer"
                aria-label="Fechar"
            >
                <X size={24} />
            </button>
        </div>
    );
}
