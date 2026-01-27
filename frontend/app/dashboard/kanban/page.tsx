"use client";

import { useState, useEffect, useMemo } from "react";
import { DropResult } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { Plus, LayoutGrid, List, Zap } from "lucide-react";
import DealModal from "@/components/kanban/DealModal";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanList } from "@/components/kanban/KanbanList";
import { KanbanFilterBar } from "@/components/kanban/KanbanFilterBar";
import { AutomationEditor } from "@/components/automations/AutomationEditor";
import { useChat } from "@/components/chat/ChatContext";
import { useToast } from "@/components/ui/use-toast";

interface Pipeline {
    id: string;
    name: string;
}

interface Stage {
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
    tags?: { tag: { id: string, name: string, color: string } }[];
}

export default function KanbanPage() {
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [deals, setDeals] = useState<Record<string, Deal[]>>({});
    const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAutomationEditorOpen, setIsAutomationEditorOpen] = useState(false);

    // WebSocket
    const { socket } = useChat();

    // View State
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    // Filter Data & States
    const [users, setUsers] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterResponsible, setFilterResponsible] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    useEffect(() => {
        fetchPipelines();
        fetchFiltersData();
    }, []);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !selectedPipeline) return;

        socket.emit('kanban:join', selectedPipeline);

        const handleDealMoved = (deal: Deal) => {
            console.log("WS: Deal Moved", deal);
            setDeals(prevDeals => {
                const newDeals = { ...prevDeals };

                // Remove from all stages first (safe approach)
                Object.keys(newDeals).forEach(stageId => {
                    newDeals[stageId] = newDeals[stageId].filter(d => d.id !== deal.id);
                });

                // Add to new stage
                if (newDeals[deal.stage_id]) {
                    newDeals[deal.stage_id] = [deal, ...newDeals[deal.stage_id]];
                } else {
                    newDeals[deal.stage_id] = [deal];
                }
                return newDeals;
            });
        };

        const handleDealCreated = (deal: Deal) => {
            console.log("WS: Deal Created", deal);
            setDeals(prevDeals => {
                const newDeals = { ...prevDeals };
                if (newDeals[deal.stage_id]) {
                    newDeals[deal.stage_id] = [deal, ...newDeals[deal.stage_id]];
                }
                return newDeals;
            });
        };

        const handleDealUpdated = (deal: Deal) => {
            console.log("WS: Deal Updated", deal);
            setDeals(prevDeals => {
                const newDeals = { ...prevDeals };
                // Update in place if stage hasn't changed (if stage changed, moved event usually fires too, but safe to check)
                // Actually if stage changed, we rely on handleDealMoved usually.
                // Assuming Updated event is for non-stage changes (or if stage change is processed there too).
                // Let's safe-check: remove and re-add if needed, or just map.

                let found = false;
                Object.keys(newDeals).forEach(stageId => {
                    newDeals[stageId] = newDeals[stageId].map(d => {
                        if (d.id === deal.id) {
                            found = true;
                            return deal;
                        }
                        return d;
                    });
                });
                return newDeals;
            });
        };

        socket.on('kanban:deal_moved', handleDealMoved);
        socket.on('kanban:deal_created', handleDealCreated);
        socket.on('kanban:deal_updated', handleDealUpdated);

        return () => {
            socket.emit('kanban:leave', selectedPipeline);
            socket.off('kanban:deal_moved', handleDealMoved);
            socket.off('kanban:deal_created', handleDealCreated);
            socket.off('kanban:deal_updated', handleDealUpdated);
        };
    }, [socket, selectedPipeline]);

    const fetchFiltersData = async () => {
        try {
            const [usersRes, tagsRes] = await Promise.all([
                api.get('/users'),
                api.get('/tags')
            ]);
            setUsers(usersRes.data);
            setTags(tagsRes.data);
        } catch (error) {
            console.error("Erro ao carregar filtros:", error);
        }
    };

    useEffect(() => {
        if (selectedPipeline) {
            fetchStagesAndDeals(selectedPipeline);
        }
    }, [selectedPipeline]);

    const fetchPipelines = async () => {
        try {
            const response = await api.get("/pipelines");
            setPipelines(response.data);
            if (response.data.length > 0) {
                setSelectedPipeline(response.data[0].id);
            }
        } catch (error) {
            console.error("Erro ao buscar pipelines:", error);
        }
    };

    const fetchStagesAndDeals = async (pipelineId: string) => {
        try {
            const [stagesRes, dealsRes] = await Promise.all([
                api.get(`/stages?pipeline_id=${pipelineId}`),
                api.get(`/deals?pipeline_id=${pipelineId}`),
            ]);

            setStages(stagesRes.data);

            const dealsByStage: Record<string, Deal[]> = {};
            stagesRes.data.forEach((stage: Stage) => {
                dealsByStage[stage.id] = [];
            });
            dealsRes.data.forEach((deal: Deal) => {
                if (dealsByStage[deal.stage_id]) {
                    dealsByStage[deal.stage_id].push(deal);
                }
            });
            setDeals(dealsByStage);

        } catch (error) {
            console.error("Erro ao buscar dados do kanban:", error);
        }
    };

    const { toast } = useToast();

    // ... existing code ...

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceStageId = source.droppableId;
            const destStageId = destination.droppableId;

            // Optional: Block drop if stage is locked and user !admin (Future expanion)

            const sourceDeals = [...(deals[sourceStageId] || [])];
            const destDeals = [...(deals[destStageId] || [])];

            const movedItemIndex = sourceDeals.findIndex(d => d.id === draggableId);
            if (movedItemIndex === -1) return;

            const [movedDeal] = sourceDeals.splice(movedItemIndex, 1);

            // Validate Required Fields locally? 
            // Better to let backend validation fail, but we could check here if we have field config loaded.
            // For now, optimistic update + revert.

            // Update local state immediately (Optimistic)
            movedDeal.stage_id = destStageId;
            destDeals.splice(destination.index, 0, movedDeal);

            setDeals({
                ...deals,
                [sourceStageId]: sourceDeals,
                [destStageId]: destDeals,
            });

            // Call API
            try {
                await api.patch(`/deals/${draggableId}`, { stage_id: destStageId });
            } catch (error: any) {
                console.error("Erro ao mover deal:", error);

                // Revert
                movedDeal.stage_id = sourceStageId;
                sourceDeals.splice(movedItemIndex, 0, movedDeal);
                destDeals.splice(destination.index, 1);

                setDeals({
                    ...deals,
                    [sourceStageId]: sourceDeals,
                    [destStageId]: destDeals,
                });

                toast({
                    title: "Não foi possível mover o card",
                    description: error.response?.data?.message || "Erro desconhecido ao atualizar etapa.",
                    variant: "destructive"
                });
            }
        }
    };

    // Prepare Filtered Deals
    const filteredDeals = useMemo(() => {
        const filteredDealsByStage: Record<string, Deal[]> = {};

        stages.forEach(stage => {
            const stageDeals = deals[stage.id] || [];
            filteredDealsByStage[stage.id] = stageDeals.filter(deal => {
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    const matchesTitle = deal.title.toLowerCase().includes(term);
                    const matchesClient = deal.client?.name?.toLowerCase().includes(term);
                    if (!matchesTitle && !matchesClient) return false;
                }
                if (filterResponsible && deal.responsible?.id !== filterResponsible) return false;
                if (filterTag && (!deal.tags || !deal.tags.some(dt => dt.tag.id === filterTag))) return false;
                return true;
            });
        });

        return filteredDealsByStage;
    }, [deals, stages, searchTerm, filterResponsible, filterTag]);

    return (
        <div className="h-full flex flex-col">
            {/* Header / Toolbar */}
            <div className="flex flex-col border-b border-gray-100 bg-white dark:bg-zinc-900 dark:border-zinc-800/50">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Kanban</h1>

                        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-all ${viewMode === 'board' ? 'bg-white dark:bg-zinc-700 shadow text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >
                                <LayoutGrid size={14} /> Board
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >
                                <List size={14} /> Lista
                            </button>
                        </div>

                        <select
                            className="border border-gray-100 rounded p-2 bg-white dark:bg-zinc-800 dark:border-zinc-800/50 dark:text-gray-100 outline-none focus:border-indigo-300 transition-colors"
                            value={selectedPipeline || ""}
                            onChange={(e) => setSelectedPipeline(e.target.value)}
                        >
                            {pipelines.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}

                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsAutomationEditorOpen(true)}
                            className="bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-700 transition shadow-sm"
                        >
                            <Zap size={18} /> Automações
                        </button>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition shadow-sm hover:shadow"
                        >
                            <Plus size={20} /> Novo Card
                        </button>
                    </div>
                </div>

                <KanbanFilterBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterResponsible={filterResponsible}
                    setFilterResponsible={setFilterResponsible}
                    filterTag={filterTag}
                    setFilterTag={setFilterTag}
                    users={users}
                    tags={tags}
                    onClear={() => {
                        setSearchTerm('');
                        setFilterResponsible(null);
                        setFilterTag(null);
                    }}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-black/20">
                {viewMode === 'board' ? (
                    <KanbanBoard
                        stages={stages}
                        dealsByStage={filteredDeals}
                        onDragEnd={onDragEnd}
                        onDealClick={setSelectedDealId}
                    />
                ) : (
                    <KanbanList
                        stages={stages}
                        dealsByStage={filteredDeals}
                        onDealClick={setSelectedDealId}
                    />
                )}
            </div>

            {/* Modals */}
            {
                (selectedDealId && selectedPipeline) && (
                    <DealModal
                        dealId={selectedDealId}
                        pipelineId={selectedPipeline}
                        initialData={Object.values(deals).flat().find(d => d.id === selectedDealId)}
                        onClose={() => setSelectedDealId(null)}
                        onUpdate={() => {
                            // Rely on WebSocket for updates to avoid full board refetch
                            // Optional: Trigger a lightweight refresh if needed
                        }}
                    />
                )
            }

            {
                (isCreateModalOpen && selectedPipeline) && (
                    <DealModal
                        dealId={null}
                        pipelineId={selectedPipeline}
                        onClose={() => setIsCreateModalOpen(false)}
                        onUpdate={() => selectedPipeline && fetchStagesAndDeals(selectedPipeline)}
                    />
                )
            }

            {
                (isAutomationEditorOpen && selectedPipeline) && (
                    <AutomationEditor
                        pipelineId={selectedPipeline}
                        stages={stages}
                        onClose={() => setIsAutomationEditorOpen(false)}
                    />
                )
            }
        </div >
    );
}
