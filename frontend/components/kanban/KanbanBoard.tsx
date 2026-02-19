import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
    stages: any[];
    dealsByStage: Record<string, any[]>;
    onDragEnd: (result: DropResult) => void;
    onDealClick: (id: string) => void;
    cardConfig?: any[]; // Optional for now
    users?: any[]; // Allow undefined to not break if not passed immediately
    onResponsibleChange?: (dealId: string, userId: string) => void;
    totalCounts?: Record<string, number>;
}

export function KanbanBoard({ stages, dealsByStage, onDragEnd, onDealClick, cardConfig, users, onResponsibleChange, totalCounts }: KanbanBoardProps) {
    return (
        <div className="h-full overflow-x-auto overflow-y-hidden bg-white">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full gap-2">
                    {stages.map(stage => {
                        const stageDeals = dealsByStage[stage.id] || [];
                        const totalValue = stageDeals.reduce((sum: number, deal: any) => sum + (Number(deal.value) || 0), 0);
                        const serverTotal = totalCounts ? (totalCounts[stage.id] || 0) : stageDeals.length;

                        return (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                deals={stageDeals}
                                totalCount={serverTotal} // Pass server total
                                totalValue={totalValue}
                                onDealClick={onDealClick}
                                cardConfig={cardConfig}
                                users={users}
                                onResponsibleChange={onResponsibleChange}
                            />
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
