'use client';

import { useState, useEffect } from 'react';
import { Filter, X, Download } from 'lucide-react';
import api from '@/lib/api';

interface ReportsFilterProps {
    onFilterChange: (filters: any) => void;
    onExport: () => void;
    userRole: string; // 'ADMIN' | 'SUPERVISOR'
}

export default function ReportsFilter({ onFilterChange, onExport, userRole }: ReportsFilterProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [operatorId, setOperatorId] = useState('');
    const [status, setStatus] = useState('');
    const [origin, setOrigin] = useState('');
    const [operators, setOperators] = useState<{ id: string, name: string }[]>([]);
    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        // Fetch operators for dropdown if Admin or Supervisor
        // Endpoint needs to be available. UsersService.findAll helps.
        // Assuming /users endpoint exists and returns users.
        const fetchOperators = async () => {
            try {
                const res = await api.get('/users');
                // Filter logic might be needed if API returns everyone.
                // But let's assume API returns accessible users.
                setOperators(res.data);
            } catch (error) {
                console.error('Failed to fetch operators', error);
            }
        };
        fetchOperators();
    }, []);

    const handleApply = () => {
        onFilterChange({
            startDate,
            endDate,
            operatorId,
            status,
            origin
        });
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setOperatorId('');
        setStatus('');
        setOrigin('');
        onFilterChange({});
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <Filter size={20} /> Filtros de Relatório
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={clearFilters}
                        className="text-sm text-gray-700 hover:text-red-500 flex items-center gap-1 px-3 py-1 font-medium dark:text-gray-400 dark:hover:text-red-400"
                    >
                        <X size={16} /> Limpar
                    </button>
                    <button
                        onClick={onExport}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium"
                    >
                        <Download size={18} /> Exportar CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Data Início</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Data Fim</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Operador</label>
                    <select
                        value={operatorId}
                        onChange={(e) => setOperatorId(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                    >
                        <option value="">Todos</option>
                        {operators.map(op => (
                            <option key={op.id} value={op.id}>{op.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100"
                    >
                        <option value="">Todos</option>
                        <option value="Cadastrando...">Cadastrando...</option>
                        <option value="Cadastro salvo com sucesso!">Sucesso</option>
                        {/* Add more status options as needed */}
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleApply}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-medium"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
}
