interface ProductionRow {
    operator_id: string;
    operator_name: string;
    total_leads: number;
    total_qualified: number;
    total_accounts: number;
    avg_tma: number;            
}

interface ProductionTableProps {
    data: ProductionRow[];
}

export default function ProductionTable({ data }: ProductionTableProps) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Produção por Operador</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                    <thead className="bg-gray-50 text-gray-800 uppercase font-bold text-xs dark:bg-zinc-800 dark:text-gray-200">
                        <tr>
                            <th className="px-6 py-3">Operador</th>
                            <th className="px-6 py-3 text-center">Leads Totais</th>
                            <th className="px-6 py-3 text-center">Qualificados</th>
                            <th className="px-6 py-3 text-center">Contas Abertas</th>
                            <th className="px-6 py-3 text-center">TMA (min)</th>
                            <th className="px-6 py-3 text-center">Taxa Conv. (Geral)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {data.map((row) => {
                            const conversion = row.total_leads > 0 ? ((row.total_accounts / row.total_leads) * 100).toFixed(1) : '0.0';
                            return (
                                <tr key={row.operator_id} className="hover:bg-gray-50 transition dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{row.operator_name}</td>
                                    <td className="px-6 py-4 text-center font-medium">{row.total_leads}</td>
                                    <td className="px-6 py-4 text-center font-medium">{row.total_qualified}</td>
                                    <td className="px-6 py-4 text-center font-bold text-green-700 dark:text-green-400">{row.total_accounts}</td>
                                    <td className="px-6 py-4 text-center font-medium">{Number(row.avg_tma).toFixed(1)}</td>
                                    <td className="px-6 py-4 text-center font-medium">{conversion}%</td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado para os filtros selecionados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
