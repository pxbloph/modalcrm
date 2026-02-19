"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface ImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<any>(null);

    // Polling interval
    const [polling, setPolling] = useState(false);

    const { toast } = useToast();

    // Reset when opening
    const handleOpen = (val: boolean) => {
        if (!val) {
            setFile(null);
            setJobId(null);
            setStatus(null);
            setPolling(false);
        }
        onOpenChange(val);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/imports/leads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setJobId(res.data.id);
            setPolling(true);
            pollStatus(res.data.id);
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro no upload",
                description: "Não foi possível enviar o arquivo.",
                variant: "destructive"
            });
            setUploading(false);
        }
    };

    const pollStatus = async (id: string) => {
        const check = async () => {
            try {
                const res = await api.get(`/imports/open-accounts/${id}`); // Assuming generic job status endpoint
                setStatus(res.data);

                if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
                    setPolling(false);
                    setUploading(false);
                    if (res.data.status === 'COMPLETED') {
                        toast({ title: "Importação concluída!", description: `${res.data.success_count} registros processados.` });
                        if (onSuccess) onSuccess();
                    } else {
                        toast({ title: "Erro na importação", description: "O processamento falhou.", variant: "destructive" });
                    }
                } else {
                    setTimeout(check, 1000);
                }
            } catch (err) {
                console.error(err);
                setPolling(false);
                setUploading(false);
            }
        };
        check();
    };

    const generateTemplate = () => {
        // Create a CSV blob
        const headers = ["CNPJ", "Razão Social", "Nome Sócio", "Email", "Telefone", "Tabulação"];
        const rows = [
            ["00000000000000", "Empresa Exemplo LTDA", "Fulano de Tal", "email@exemplo.com", "11999999999", "Sem interesse"]
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_importacao_leads.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importar Leads</DialogTitle>
                    <DialogDescription>
                        Faça upload de uma planilha (CSV/Excel) para criar ou atualizar leads em massa usando o CNPJ como chave.
                    </DialogDescription>
                </DialogHeader>

                {!jobId ? (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="font-semibold">Clique para enviar</span>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV ou XLSX</p>
                                </div>
                                <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
                            </label>
                        </div>

                        {file && (
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                                <FileSpreadsheet className="w-4 h-4" />
                                {file.name}
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <button onClick={generateTemplate} className="flex items-center gap-1 text-indigo-600 hover:underline">
                                <Download className="w-3 h-3" /> Baixar modelo
                            </button>
                        </div>

                        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {uploading ? 'Enviando...' : 'Iniciar Importação'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-6 text-center">
                        {status?.status === 'PROCESSING' && (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                                <p className="font-medium">Processando... {status.processed_records} / {status.total_records || '?'}</p>
                            </div>
                        )}

                        {status?.status === 'COMPLETED' && (
                            <div className="flex flex-col items-center gap-2 text-green-600">
                                <CheckCircle2 className="w-12 h-12" />
                                <p className="font-bold text-lg">Concluído!</p>
                                <p className="text-sm text-gray-600">
                                    Sucesso: {status.success_count} | Erros: {status.error_count}
                                </p>
                                <Button variant="outline" onClick={() => handleOpen(false)}>Fechar</Button>
                            </div>
                        )}

                        {status?.status === 'FAILED' && (
                            <div className="text-red-500">
                                <p>Ocorreu um erro no processamento.</p>
                                <Button variant="outline" onClick={() => setJobId(null)} className="mt-2">Tentar Novamente</Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
