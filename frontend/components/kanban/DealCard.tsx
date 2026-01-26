import { Draggable } from "@hello-pangea/dnd";
import { User } from "lucide-react";

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

interface DealCardProps {
    deal: Deal;
    index: number;
    onClick: (id: string) => void;
}

export function DealCard({ deal, index, onClick }: DealCardProps) {
    return (
        <Draggable draggableId={deal.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(deal.id)}
                    className={`
                        bg-white dark:bg-[#18181b] p-3 mb-2 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 
                        hover:shadow-md cursor-grab active:cursor-grabbing text-left transition-all group relative
                        ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500/20 rotate-2 z-50' : ''}
                    `}
                    style={{ ...provided.draggableProps.style }}
                >
                    {/* Tags Strip */}
                    {deal.tags && deal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {deal.tags.map(dt => (
                                <span
                                    key={dt.tag.id}
                                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white truncate max-w-[80px]"
                                    style={{ backgroundColor: dt.tag.color }}
                                >
                                    {dt.tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2 leading-tight">
                        {deal.title}
                    </div>

                    {deal.value != null && (
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-bold mb-3 flex items-center gap-1">
                            <span className="text-xs text-gray-400 font-normal">R$</span>
                            {Number(deal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 dark:border-zinc-800/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={deal.client?.name}>
                            {deal.client?.name || "Sem cliente"}
                        </div>

                        {/* Responsible Avatar */}
                        {deal.responsible ? (
                            <div
                                title={deal.responsible.name}
                                className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold border border-indigo-200 dark:border-indigo-500/20"
                            >
                                {deal.responsible.name.substring(0, 2).toUpperCase()}
                            </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 flex items-center justify-center">
                                <User size={12} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}
