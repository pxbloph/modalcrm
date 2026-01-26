'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import ReportsFilter from '@/components/reports/ReportsFilter';
import MetricCard from '@/components/reports/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({});

    const [dashboardStats, setDashboardStats] = useState<any>({});
    const [stagesData, setStagesData] = useState<any[]>([]);
    const [productionData, setProductionData] = useState<any[]>([]);

    const fetchData = async (currentFilters: any) => {
        setLoading(true);
        try {
            // Build query string
            const params = new URLSearchParams();
            Object.keys(currentFilters).forEach(key => {
                if (currentFilters[key]) params.append(key, currentFilters[key]);
            });
            const queryString = params.toString();

            const [dashRes, stagesRes, prodRes] = await Promise.all([
                api.get(`/reports/conversion?${queryString}`), // dashboard stats
                api.get(`/reports/stages?${queryString}`),
                api.get(`/reports/production?${queryString}`)
            ]);

            setDashboardStats(dashRes.data);
            setStagesData(stagesRes.data);
            setProductionData(prodRes.data);
        } catch (error) {
            console.error("Erro ao carregar relatórios", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData({});
    }, []);

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
        fetchData(newFilters);
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                // @ts-ignore
                if (filters[key]) params.append(key, filters[key]);
            });

            const response = await api.get(`/reports/export?${params.toString()}`, {
                responseType: 'blob',
            });

            // Backend returns JSON but we requested blob, axios handles it.
            // If backend returns JSON, we need to parse. But if responseType is blob, it comes as Blob.
            // Actually my service returns JSON object array.
            // Let's assume user wants CSV. I will convert JSON to CSV in frontend as before.

            // Re-fetch as JSON to convert
            const resJson = await api.get(`/reports/export?${params.toString()}`);
            const data = resJson.data;

            if (!data || data.length === 0) {
                alert("Sem dados para exportar.");
                return;
            }

            const headers = Object.keys(data[0]).join(',');
            const rows = data.map((row: any) => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
            const csvContent = `${headers}\n${rows}`;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_crm_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error("Erro na exportação", err);
            alert("Erro ao exportar dados.");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    Relatórios de Performance
                </h1>
            </div>

            <ReportsFilter
                onFilterChange={handleFilterChange}
                onExport={handleExport}
                userRole="ADMIN"
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total de Negócios"
                    value={dashboardStats.total_leads || 0}
                    color="blue"
                />
                <MetricCard
                    title="Negócios Ganhos"
                    value={dashboardStats.total_qualified || 0}
                    subtext={`${Number(dashboardStats.conversion_rate || 0).toFixed(1)}% Conversão`}
                    color="green"
                />
                <MetricCard
                    title="Valor em Pipeline"
                    value={`R$ ${Number(dashboardStats.total_value || 0).toLocaleString('pt-BR')}`}
                    color="purple"
                />
                <MetricCard
                    title="Ticket Médio"
                    value={`R$ ${dashboardStats.total_qualified > 0 ? (dashboardStats.total_value / dashboardStats.total_leads).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'}`}
                    color="orange"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Funnel Chart (Bar Chart for now) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Funil de Vendas (Por Etapa)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stagesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="stage_name" type="category" width={100} />
                                <Tooltip
                                    formatter={(value: any) => [value, "Negócios"]}
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {stagesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.stage_color || '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Performers (Mini Table) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {productionData.slice(0, 5).map((user, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-gray-600 dark:text-gray-300">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.operator_name}</p>
                                            <p className="text-xs text-gray-500">{user.total_leads} negócios</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-green-600">{user.total_qualified} Ganhos</p>
                                        <p className="text-xs text-gray-400">{Number(user.conversion_pct).toFixed(0)}% Conv.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Full Production Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento por Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-800 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Responsável</th>
                                    <th scope="col" className="px-6 py-3 text-center">Total Negócios</th>
                                    <th scope="col" className="px-6 py-3 text-center">Ganhos</th>
                                    <th scope="col" className="px-6 py-3 text-center">Valor Total</th>
                                    <th scope="col" className="px-6 py-3 text-center">Conversão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productionData.map((row, idx) => (
                                    <tr key={idx} className="bg-white border-b dark:bg-zinc-900 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{row.operator_name}</td>
                                        <td className="px-6 py-4 text-center">{row.total_leads}</td>
                                        <td className="px-6 py-4 text-center text-green-600 font-semibold">{row.total_qualified}</td>
                                        <td className="px-6 py-4 text-center">R$ {Number(row.total_value).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4 text-center">{Number(row.conversion_pct).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {loading && (
                <div className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
                </div>
            )}
        </div>
    );
}
