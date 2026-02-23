"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

interface ExportButtonProps {
    filters: any;
    pipelineId?: string;
    visibleColumns?: string[];
    label?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function ExportButton({
    filters,
    pipelineId,
    visibleColumns,
    label = "Exportar",
    variant = "outline",
    size = "sm",
    className
}: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        try {
            setIsExporting(true);

            // Prepare query params
            const params = new URLSearchParams();
            if (pipelineId) params.append("pipelineId", pipelineId);

            // Add visible columns if any
            if (visibleColumns && visibleColumns.length > 0) {
                params.append("columns", visibleColumns.join(','));
            }

            // Add all active filters
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== "") {
                        const valToAppend = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        params.append(key, valToAppend);
                    }
                });
            }

            const downloadUrl = `/clients/export?${params.toString()}`;

            // We use a direct link for download to leverage browser's attachment handling
            // But we check first if there's data via a HEAD or small GET if we wanted to be fancy.
            // For now, let's just trigger the download.

            const response = await api.get(downloadUrl, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from header if possible, else fallback
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename=(.+)/);
                if (fileNameMatch) fileName = fileNameMatch[1].replace(/"/g, '');
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Exportação concluída com sucesso!");
        } catch (error: any) {
            console.error("Export error:", error);
            if (error.response?.status === 404) {
                toast.error("Nenhum dado encontrado para os filtros aplicados.");
            } else {
                toast.error("Falha ao exportar leads. Tente novamente.");
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleExport}
            disabled={isExporting}
            className={className}
        >
            <Download className={`w-4 h-4 ${label ? 'mr-2' : ''} ${isExporting ? 'animate-pulse' : ''}`} />
            {label}
        </Button>
    );
}
