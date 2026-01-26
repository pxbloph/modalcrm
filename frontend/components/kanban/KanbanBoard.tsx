import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
    stages: any[];
    dealsByStage: Record<string, any[]>;
    onDragEnd: (result: DropResult) => void;
    onDealClick: (id: string) => void;
}

export function KanbanBoard({ stages, dealsByStage, onDragEnd, onDealClick }: KanbanBoardProps) {
    return (
        <div className="h-full overflow-x-auto overflow-y-hidden p-4">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full gap-4">
                    {stages.map(stage => {
                        const stageDeals = dealsByStage[stage.id] || [];
                        const totalValue = stageDeals.reduce((sum: number, deal: any) => sum + (Number(deal.value) || 0), 0);

                        return (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                deals={stageDeals}
                                totalValue={totalValue}
                                onDealClick={onDealClick}
                            />
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
