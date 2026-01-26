import { Droppable } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";

interface KanbanColumnProps {
    stage: {
        id: string;
        name: string;
        color: string;
    };
    deals: any[];
    totalValue: number;
    onDealClick: (id: string) => void;
}

export function KanbanColumn({ stage, deals, totalValue, onDealClick }: KanbanColumnProps) {
    return (
        <div className="w-80 flex-shrink-0 flex flex-col bg-gray-100/50 dark:bg-zinc-900/50 rounded-xl max-h-full border border-gray-200/60 dark:border-zinc-800">
            {/* Column Header */}
            <div
                className="p-3 border-b border-gray-200/60 dark:border-zinc-800 bg-transparent rounded-t-xl"
                style={{ borderTop: `4px solid ${stage.color}` }}
            >
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-700 dark:text-gray-200 truncate">{stage.name}</span>
                    <span className="text-xs bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 font-medium">
                        {deals.length}
                    </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Total: {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`
                            flex-1 p-2 overflow-y-auto min-h-[100px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700
                            ${snapshot.isDraggingOver ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                            transition-colors
                        `}
                    >
                        {deals.map((deal, index) => (
                            <DealCard
                                key={deal.id}
                                deal={deal}
                                index={index}
                                onClick={onDealClick}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
