
interface Tag {
    id: string;
    name: string;
    color: string;
}

interface Deal {
    id: string;
    title: string;
    value?: number;
    stage_id: string;
    client?: { name: string };
    responsible?: { id: string, name: string };
    tags?: { tag: Tag }[];
}

interface Stage {
    id: string;
    name: string;
    color: string;
}

interface KanbanListProps {
    stages: Stage[];
    dealsByStage: Record<string, Deal[]>;
    onDealClick: (id: string) => void;
}

export function KanbanList({ stages, dealsByStage, onDealClick }: KanbanListProps) {
    return (
        <div className="h-full overflow-auto p-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 font-medium text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">Negócio</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Etapa</th>
                            <th className="px-4 py-3">Valor</th>
                            <th className="px-4 py-3">Responsável</th>
                            <th className="px-4 py-3">Tags</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {stages.flatMap(stage => {
                            const stageDeals = dealsByStage[stage.id] || [];
                            return stageDeals.map(deal => (
                                <tr
                                    key={deal.id}
                                    onClick={() => onDealClick(deal.id)}
                                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{deal.title}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{deal.client?.name || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 border"
                                            style={{ borderColor: stage.color, color: stage.color }}
                                        >
                                            {stage.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                                        {deal.value ? Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {deal.responsible?.name || "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 flex-wrap">
                                            {deal.tags?.map((dt: any) => (
                                                <span
                                                    key={dt.tag.id}
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: dt.tag.color }}
                                                    title={dt.tag.name}
                                                ></span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ));
                        })}
                        {stages.every(s => !dealsByStage[s.id]?.length) && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    Nenhum card encontrado com os filtros atuais.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
