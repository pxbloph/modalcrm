'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Download, RefreshCw, X } from 'lucide-react';
import api from '@/lib/api';

interface ImportJob {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    file_name: string;
    total_records: number;
    processed_records: number;
    success_count: number;
    error_count: number;
    created_at: string;
}

export default function ImportOpenAccountsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [job, setJob] = useState<ImportJob | null>(null);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Polling for job status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (job && (job.status === 'PENDING' || job.status === 'PROCESSING')) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/imports/open-accounts/${job.id}`);
                    setJob(res.data);
                } catch (err) {
                    console.error('Error polling job status', err);
                }
            }, 2000); // Check every 2s
        }

        return () => clearInterval(interval);
    }, [job]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Selecione um arquivo para importar.');
            return;
        }

        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/imports/open-accounts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setJob(res.data);
            setFile(null); // Clear input
        } catch (err: any) {
            console.error('Upload failed', err);
            setError(err.response?.data?.message || 'Falha ao iniciar importação.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadResult = async () => {
        if (!job) return;
        try {
            const response = await api.get(`/imports/open-accounts/${job.id}/download`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `import_result_${job.id}.csv`); // or file extension from server
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Download failed', err);
            setError('Falha ao baixar resultados.');
        }
    };

    const handleDownloadTemplate = () => {
        const csvContent = "CNPJ\n00000000000000\n11111111111111";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'modelo_importacao_contas.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Importação em Massa</h1>
                    <p className="text-gray-700 mt-2 font-medium dark:text-gray-300">
                        Importar lista de contas abertas (atualizar status "has_open_account").
                    </p>
                </div>
                <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 px-3 py-2 rounded border border-blue-200"
                >
                    <FileText size={16} /> Baixar Modelo CSV
                </button>
            </div>

            {/* Upload Section */}
            {!job && (
                <div className="bg-white p-8 rounded-lg shadow border border-gray-100 text-center dark:bg-zinc-900 dark:border-zinc-800">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700">
                        <Upload size={48} className="text-gray-400 mb-4 dark:text-gray-500" />
                        <h3 className="text-lg font-bold text-gray-700 mb-2 dark:text-gray-200">Upload de Arquivo CSV ou Excel</h3>
                        <p className="text-gray-500 text-sm mb-6 dark:text-gray-400">
                            O arquivo deve conter uma coluna "CNPJ".
                        </p>

                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold cursor-pointer hover:bg-blue-700 transition"
                        >
                            {file ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
                        </label>

                        {file && (
                            <div className="mt-4 flex items-center gap-2 text-gray-800 font-medium bg-blue-50 px-4 py-2 rounded dark:bg-blue-900/30 dark:text-blue-100">
                                <FileText size={18} />
                                {file.name}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded text-sm font-bold flex items-center justify-center gap-2">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className={`mt-6 w-full py-3 rounded-lg text-white font-bold text-lg transition ${!file || isUploading
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {isUploading ? 'Enviando...' : 'Processar Importação'}
                    </button>
                </div>
            )}

            {/* Job Status Section */}
            {job && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Processando Importação</h3>
                            <p className="text-gray-600 text-sm dark:text-gray-400">ID: {job.id}</p>
                        </div>
                        <div className={`px-3 py-1 rounded text-sm font-bold flex items-center gap-2 ${job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {job.status === 'PROCESSING' && <RefreshCw size={14} className="animate-spin" />}
                            {job.status}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">
                            <span>Progresso</span>
                            <span>{job.total_records > 0 ? Math.round((job.processed_records / job.total_records) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden dark:bg-zinc-700">
                            <div
                                className="bg-blue-600 h-4 transition-all duration-500 ease-out"
                                style={{ width: `${job.total_records > 0 ? (job.processed_records / job.total_records) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1 dark:text-gray-400">
                            {job.processed_records} / {job.total_records} registros
                        </div>
                    </div>

                    {/* Results Summary */}
                    {(job.status === 'COMPLETED' || job.status === 'FAILED') && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-green-50 p-4 rounded border border-green-100 dark:bg-green-900/20 dark:border-green-900/30">
                                <h4 className="text-xs font-bold text-green-800 uppercase dark:text-green-400">Sucesso</h4>
                                <p className="text-2xl font-extrabold text-green-700 dark:text-green-300">{job.success_count}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded border border-red-100 dark:bg-red-900/20 dark:border-red-900/30">
                                <h4 className="text-xs font-bold text-red-800 uppercase dark:text-red-400">Erros</h4>
                                <p className="text-2xl font-extrabold text-red-700 dark:text-red-300">{job.error_count}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {(job.status === 'COMPLETED' || job.status === 'FAILED') && (
                            <>
                                <button
                                    onClick={handleDownloadResult}
                                    className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-900 transition flex items-center justify-center gap-2 font-bold"
                                >
                                    <Download size={18} /> Baixar Relatório Detalhado
                                </button>
                                <button
                                    onClick={() => { setJob(null); setFile(null); }}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50"
                                >
                                    Nova Importação
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
