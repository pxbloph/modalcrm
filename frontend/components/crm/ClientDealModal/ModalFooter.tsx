import React from "react";
import { Save, Trash, X, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalFooterProps {
    onClose: () => void;
    onSave: () => void;
    onDelete?: () => void;
    onOpenAccount?: () => void;
    saving?: boolean;
    canDelete?: boolean;
    isBlocked?: boolean;
}

export function ModalFooter({ onClose, onSave, onDelete, onOpenAccount, saving, canDelete, isBlocked }: ModalFooterProps) {
    return (
        <div className="px-6 py-4 border-t border-border bg-muted/80 backdrop-blur-sm flex justify-between items-center z-10 sticky bottom-0">
            <div>
                {canDelete && onDelete && !isBlocked && (
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onDelete(); }}
                        className="text-xs font-bold text-destructive hover:text-destructive/80 uppercase tracking-wide px-3 py-1.5 hover:bg-destructive/10 rounded transition-colors flex items-center gap-1"
                    >
                        <Trash size={14} /> Excluir Card
                    </button>
                )}
            </div>
            <div className="flex gap-4">
                {onOpenAccount && !isBlocked && (
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onOpenAccount(); }}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 transition-all uppercase tracking-wide flex items-center gap-2 transform active:scale-95"
                    >
                        <CheckCircle size={14} /> Marcar Conta Aberta
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-border font-bold text-muted-foreground text-xs hover:bg-background shadow-sm hover:shadow transition-all uppercase tracking-wide"
                >
                    Fechar
                </button>
                {!isBlocked && (
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className={cn(
                            "px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 transition-all transform active:scale-95 uppercase tracking-wide",
                            "disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        )}
                    >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        {saving ? 'Salvando...' : 'SALVAR'}
                    </button>
                )}
            </div>
        </div>
    );
}
