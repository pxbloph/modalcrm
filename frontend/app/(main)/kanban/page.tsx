"use client";

import { useState, useEffect, useMemo } from "react";
import { DropResult } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { Plus, LayoutGrid, List, Zap, Settings2 } from "lucide-react";
import DealModal from "@/components/kanban/DealModal";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanList } from "@/components/kanban/KanbanList";
import { UnifiedFilterBar } from "@/components/filters/UnifiedFilterBar";
import { KanbanCardConfigModal } from "@/components/kanban/KanbanCardConfigModal";
import { AutomationEditor } from "@/components/automations/AutomationEditor";
import { useChat } from "@/components/chat/ChatContext";
import { useToast } from "@/components/ui/use-toast";
import { isWithinInterval, parseISO, startOfDay, endOfDay, subDays } from "date-fns";
import { MetricsCards, DashboardMetrics } from "@/components/dashboard/MetricsCards";

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
    created_at: string;
    client?: {
        name: string;
        surname?: string;
        created_at?: string;
        account_opening_date?: string;
        qualifications?: { tabulacao?: string }[];
    };
    responsible?: { id: string, name: string };
    tags?: { tag: { id: string, name: string, color: string } }[];
}

import { useRouter } from "next/navigation";

export default function KanbanPage() {
    const router = useRouter();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [deals, setDeals] = useState<Record<string, Deal[]>>({});
    const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
    const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAutomationEditorOpen, setIsAutomationEditorOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    // Metrics State
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    // Card Config State
    const [cardConfig, setCardConfig] = useState<any[]>([]);

    // WebSocket
    const { socket } = useChat();

    // View State
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    // Filter Data & States
    const [users, setUsers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null); // To store current logged in user
    const [searchTerm, setSearchTerm] = useState("");
    const [filterResponsible, setFilterResponsible] = useState<string | null>(null);

    // New Filters
    const [tabulation, setTabulation] = useState<string>("");
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]);

    // Default Filter: Last 2 Days (Optimization)
    const [isDefaultView, setIsDefaultView] = useState(true);
    const [creationDate, setCreationDate] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>({
        from: subDays(new Date(), 10),
        to: undefined
    });
    const [accountDate, setAccountDate] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>(undefined);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);

            // SECURITY: Redirect Operators away from Kanban
            if (parsedUser.role === 'OPERATOR') {
                window.location.href = '/new-client'; // Force redirect
                return;
            }
        }
        fetchPipelines();
        fetchFiltersData();
        fetchMetrics();
    }, []);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !selectedPipeline) return;

        socket.emit('kanban:join', selectedPipeline);

        const handleDealMoved = (deal: Deal) => {
            console.log("WS: Deal Moved", deal);
            setDeals(prevDeals => {
                const newDeals = { ...prevDeals };
                Object.keys(newDeals).forEach(stageId => {
                    newDeals[stageId] = newDeals[stageId].filter(d => d.id !== deal.id);
                });
                if (newDeals[deal.stage_id]) {
                    newDeals[deal.stage_id] = [deal, ...newDeals[deal.stage_id]];
                } else {
                    newDeals[deal.stage_id] = [deal];
                }
                return newDeals;
            });
            fetchMetrics(); // Refresh metrics on move
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
            fetchMetrics(); // Refresh metrics on create
        };

        const handleDealUpdated = (deal: Deal) => {
            console.log("WS: Deal Updated", deal);
            setDeals(prevDeals => {
                const newDeals = { ...prevDeals };
                Object.keys(newDeals).forEach(stageId => {
                    newDeals[stageId] = newDeals[stageId].map(d => {
                        if (d.id === deal.id) {
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
            const [usersRes, tabsRes] = await Promise.all([
                api.get('/users'),
                api.get('/qualifications/tabulations')
            ]);
            setUsers(usersRes.data);
            if (Array.isArray(tabsRes.data)) {
                setTabulationOptions(tabsRes.data);
            }
        } catch (error) {
            console.error("Erro ao carregar filtros:", error);
        }
    };

    const fetchMetrics = async () => {
        setMetricsLoading(true);
        try {
            const params: any = {};

            // Filters
            if (selectedPipeline) params.pipelineId = selectedPipeline;
            if (searchTerm) params.search = searchTerm;
            if (filterResponsible) params.responsibleId = filterResponsible;
            if (tabulation) params.tabulation = tabulation;

            if (tabulation) params.tabulation = tabulation;

            // Only apply Date Filter to metrics if it's explicitly set by user (not the default optimization)
            if (!isDefaultView) {
                if (creationDate?.from) params.startDate = creationDate.from.toISOString();
                if (creationDate?.to) params.endDate = creationDate.to.toISOString();
            }

            if (accountDate?.from) params.openAccountStartDate = accountDate.from.toISOString();
            if (accountDate?.to) params.openAccountEndDate = accountDate.to.toISOString();

            const res = await api.get('/clients/dashboard-metrics', { params });
            setMetrics(res.data);
        } catch (error) {
            console.error("Erro ao carregar métricas:", error);
        } finally {
            setMetricsLoading(false);
        }
    };

    // Reactive Metrics (Update when filters change)
    useEffect(() => {
        // Debounce to prevent spam during typing
        const timer = setTimeout(() => {
            fetchMetrics();
            if (selectedPipeline) {
                fetchStagesAndDeals(selectedPipeline);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [selectedPipeline, searchTerm, filterResponsible, tabulation, creationDate, accountDate]);

    // Initial Load (already covered by effect above, but fetchPipelines is separate)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);

            // SECURITY: Redirect Operators away from Kanban
            if (parsedUser.role === 'OPERATOR') {
                window.location.href = '/new-client'; // Force redirect
                return;
            }
        }
        fetchPipelines();
        fetchFiltersData();
    }, []);

    const fetchCardConfig = async (pipelineId: string, userId: string) => {
        try {
            const res = await api.get(`/pipelines/${pipelineId}/config?userId=${userId}`);
            if (res.data && res.data.fields) {
                setCardConfig(res.data.fields);
            } else {
                setCardConfig([]); // Default
            }
        } catch (error) {
            console.error("Erro ao buscar config do card:", error);
        }
    }

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

    useEffect(() => {
        if (selectedPipeline) {
            // fetchStagesAndDeals(selectedPipeline); // Moved to debounced effect
            if (currentUser) {
                fetchCardConfig(selectedPipeline, currentUser.id);
            }
        }
    }, [selectedPipeline, currentUser]);

    // ... (keep fetchStagesAndDeals and others) ...
    const fetchStagesAndDeals = async (pipelineId: string) => {
        try {
            const params: any = { pipeline_id: pipelineId };
            if (searchTerm) params.search = searchTerm;

            // Date Filter (Sent to backend now)
            if (creationDate?.from) {
                params.startDate = startOfDay(creationDate.from).toISOString();
                if (creationDate.to) {
                    params.endDate = endOfDay(creationDate.to).toISOString();
                } else {
                    // Implicitly from strict start date, or open ended? Usually "Last X Days" implies from X to Now.
                    // If no 'to' is set, we send current date as end? 
                    // No, usually date picker 'from' means ">= from". If 'to' is missing it might mean "single day" or "range start".
                    // In DateRangePicker, usually both are set or just one. If just one, it's open or single day.
                    // For "Last 15 days", we want ">= X". 
                    // Let's purposefully NOT send endDate if it's undefined, letting backend handle it as "from X onwards".
                }
            }
            if (creationDate?.to) { // If explicitly set
                params.endDate = endOfDay(creationDate.to).toISOString();
            }

            const countsParams: any = { pipeline_id: pipelineId };
            if (searchTerm) countsParams.search = searchTerm;
            if (tabulation) countsParams.tabulation = tabulation;
            if (filterResponsible) countsParams.responsible_id = filterResponsible;
            // For counts, we ignore the default 2-day limit to show TRUE TOTAL.
            // Only apply date if EXPLICITLY set.
            if (!isDefaultView) {
                if (creationDate?.from) countsParams.startDate = startOfDay(creationDate.from).toISOString();
                if (creationDate?.to) countsParams.endDate = endOfDay(creationDate.to).toISOString();
            }

            const [stagesRes, dealsRes, countsRes] = await Promise.all([
                api.get(`/stages?pipeline_id=${pipelineId}`),
                api.get(`/deals`, { params }),
                api.get(`/deals/counts-by-stage`, { params: countsParams })
            ]);

            setStages(stagesRes.data);
            setStageCounts(countsRes.data); // New State

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

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceStageId = source.droppableId;
            const destStageId = destination.droppableId;

            const sourceDeals = [...(deals[sourceStageId] || [])];
            const destDeals = [...(deals[destStageId] || [])];

            const movedItemIndex = sourceDeals.findIndex(d => d.id === draggableId);
            if (movedItemIndex === -1) return;

            const [movedDeal] = sourceDeals.splice(movedItemIndex, 1);
            movedDeal.stage_id = destStageId;
            destDeals.splice(destination.index, 0, movedDeal);

            setDeals({
                ...deals,
                [sourceStageId]: sourceDeals,
                [destStageId]: destDeals,
            });

            try {
                await api.patch(`/deals/${draggableId}`, { stage_id: destStageId });
                fetchMetrics(); // Refresh metrics after successful move
            } catch (error: any) {
                console.error("Erro ao mover deal:", error);
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

    const handleResponsibleChange = async (dealId: string, userId: string) => {
        try {
            await api.patch(`/deals/${dealId}`, { user_id: userId });
            toast({ title: "Responsável atualizado com sucesso" });
            fetchMetrics();
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar responsável",
                description: error.response?.data?.message || "Ocorreu um erro ao atualizar o responsável.",
                variant: "destructive"
            });
        }
    };

    const filteredDeals = useMemo(() => {
        const filteredDealsByStage: Record<string, Deal[]> = {};

        stages.forEach(stage => {
            const stageDeals = deals[stage.id] || [];
            filteredDealsByStage[stage.id] = stageDeals.filter(deal => {
                // Search Term - Handled by Backend
                // if (searchTerm) { ... }

                // Responsible
                if (filterResponsible && deal.responsible?.id !== filterResponsible) return false;

                // Tabulation (via Client Qualifications)
                if (tabulation) {
                    const latestQual = deal.client?.qualifications?.[0];
                    if (!latestQual || latestQual.tabulacao !== tabulation) return false;
                }

                // Creation Date (Deal) - HANDLED BY BACKEND NOW
                // if (creationDate?.from) { ... }

                // Account Opening Date (Client)
                if (accountDate?.from) {
                    if (!deal.client?.account_opening_date) return false; // Filter active but no date = exclude
                    const accDate = parseISO(deal.client.account_opening_date);
                    const start = startOfDay(accountDate.from);
                    const end = accountDate.to ? endOfDay(accountDate.to) : endOfDay(accountDate.from);
                    if (!isWithinInterval(accDate, { start, end })) return false;
                }

                return true;
            });
        });

        return filteredDealsByStage;
    }, [deals, stages, searchTerm, filterResponsible, tabulation, creationDate, accountDate]);

    return (
        <div className="flex flex-col bg-background h-[calc(100vh-64px)]">
            {/* 1. Métricas no Topo */}
            <div className="pt-1 px-4 pb-2 shrink-0">
                <MetricsCards metrics={metrics} loading={metricsLoading} />
            </div>

            {/* 2. Barra de Controle (Sticky) */}
            <div className="flex flex-col border-y border-border bg-card sticky top-0 z-20 shadow-sm shrink-0">
                <div className="flex items-center justify-between px-4 py-2 gap-4">

                    {/* LEFTSIDE: Identidade + Controles Visuais */}
                    <div className="flex items-center gap-4 shrink-0">
                        <h1 className="text-lg font-semibold text-foreground hidden md:block">CRM</h1>

                        <div className="h-6 w-px bg-border hidden md:block" />

                        <div className="flex bg-muted p-1 rounded-md border border-border">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === 'board' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <LayoutGrid size={14} /> Board
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <List size={14} /> Lista
                            </button>
                        </div>

                        <select
                            className="h-9 border-0 bg-transparent text-sm font-semibold text-foreground outline-none focus:ring-0 cursor-pointer min-w-[150px] max-w-[200px]"
                            value={selectedPipeline || ""}
                            onChange={(e) => setSelectedPipeline(e.target.value)}
                        >
                            {pipelines.map(p => (
                                <option key={p.id} value={p.id} className="bg-card text-foreground">{p.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => setIsConfigModalOpen(true)}
                            title="Configurar visualização dos cards"
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                            <Settings2 size={16} />
                        </button>
                    </div>

                    {/* CENTER: Filtros In-line */}
                    <div className="flex-1 mx-4 max-w-4xl">
                        <UnifiedFilterBar
                            variant="inline"
                            users={users}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            responsible={filterResponsible}
                            onResponsibleChange={setFilterResponsible}
                            tabulation={tabulation}
                            onTabulationChange={setTabulation}
                            tabulationOptions={tabulationOptions}
                            creationDate={creationDate}
                            onCreationDateChange={(val) => {
                                setCreationDate(val);
                                setIsDefaultView(false);
                            }}
                            accountDate={accountDate}
                            onAccountDateChange={setAccountDate}
                            onClear={() => {
                                setSearchTerm('');
                                setFilterResponsible(null);
                                setTabulation('');
                                setCreationDate(undefined);
                                setIsDefaultView(false); // Clear means show all, so not default optimization
                                setAccountDate(undefined);
                            }}
                        />
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex gap-3 shrink-0">
                        <button
                            onClick={() => setIsAutomationEditorOpen(true)}
                            className="h-9 px-3 text-sm font-medium bg-card text-foreground border border-border rounded-md flex items-center gap-2 hover:bg-accent transition-colors"
                        >
                            <Zap size={16} /> <span className="hidden xl:inline">Automações</span>
                        </button>

                        <button
                            onClick={() => router.push('/new-client')}
                            className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground border border-transparent rounded-md flex items-center gap-2 hover:bg-primary/90 transition shadow-sm"
                        >
                            <Plus size={16} /> <span className="hidden lg:inline">Novo Negócio</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white">
                {viewMode === 'board' ? (
                    <KanbanBoard
                        stages={stages}
                        dealsByStage={filteredDeals}
                        totalCounts={stageCounts}
                        onDragEnd={onDragEnd}
                        onDealClick={setSelectedDealId}
                        cardConfig={cardConfig}
                        users={users}
                        onResponsibleChange={handleResponsibleChange}
                    />
                ) : (
                    <KanbanList
                        stages={stages}
                        dealsByStage={filteredDeals}
                        onDealClick={setSelectedDealId}
                    />
                )}
            </div>

            {(selectedDealId && selectedPipeline) && (
                <DealModal
                    dealId={selectedDealId}
                    pipelineId={selectedPipeline}
                    initialData={Object.values(deals).flat().find(d => d.id === selectedDealId)}
                    onClose={() => setSelectedDealId(null)}
                    onUpdate={() => {
                        // Handled via WS
                    }}
                />
            )}

            {(isCreateModalOpen && selectedPipeline) && (
                <DealModal
                    dealId={null}
                    pipelineId={selectedPipeline}
                    onClose={() => setIsCreateModalOpen(false)}
                    onUpdate={() => selectedPipeline && fetchStagesAndDeals(selectedPipeline)}
                />
            )}

            {(isAutomationEditorOpen && selectedPipeline) && (
                <AutomationEditor
                    pipelineId={selectedPipeline}
                    stages={stages}
                    onClose={() => setIsAutomationEditorOpen(false)}
                />
            )}

            {(isConfigModalOpen && selectedPipeline && currentUser) && (
                <KanbanCardConfigModal
                    isOpen={isConfigModalOpen}
                    onClose={() => setIsConfigModalOpen(false)}
                    pipelineId={selectedPipeline}
                    userId={currentUser.id}
                    onSave={(newConfig) => setCardConfig(newConfig)}
                />
            )}
        </div>
    );
}
