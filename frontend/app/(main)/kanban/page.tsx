"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DropResult } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { Plus, LayoutGrid, List, Zap, Settings2 } from "lucide-react";
import DealModal from "@/components/kanban/DealModal";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanList, AVAILABLE_COLUMNS } from "@/components/kanban/KanbanList";
import { UnifiedFilterBar } from "@/components/filters/UnifiedFilterBar";
import { ExportButton } from "@/components/kanban/ExportButton";
import { KanbanCardConfigModal } from "@/components/kanban/KanbanCardConfigModal";
import { AutomationEditor } from "@/components/automations/AutomationEditor";
import { useChat } from "@/components/chat/ChatContext";
import { useToast } from "@/components/ui/use-toast";
import { isWithinInterval, parseISO, startOfDay, endOfDay, subDays, format } from "date-fns";
import { MetricsCards, DashboardMetrics } from "@/components/dashboard/MetricsCards";
import { useKanbanFilters } from "@/hooks/useKanbanFilters";

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
        // [SIMPLIFICATION] Direct fields
        tabulacao?: string;
        faturamento_mensal?: number;
    };
    responsible?: { id: string, name: string; surname?: string };
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
    const [pageSize, setPageSize] = useState(25);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Filter Data & States
    const [users, setUsers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null); // To store current logged in user
    const [searchTerm, setSearchTerm] = useState("");
    const [tabulationOptions, setTabulationOptions] = useState<string[]>([]);
    const [presets, setPresets] = useState<any[]>([]);

    const {
        activeFilters,
        visibleFields,
        setFilter,
        removeFilter,
        clearAll,
        addField,
        removeField,
        setVisibleFields,
        setActiveFilters
    } = useKanbanFilters();

    const [draftFilters, setDraftFilters] = useState<{ id: string, value: any }[]>([]);
    const [draftVisibleFields, setDraftVisibleFields] = useState<string[]>([]);

    // Elevated Column State for KanbanList/Export logic
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    useEffect(() => {
        const saved = localStorage.getItem('crm-list-config-v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.order && Array.isArray(parsed.order)) {
                    setColumnOrder(parsed.order);
                }
            } catch (e) { }
        } else {
            // Default columns if none saved
            setColumnOrder(['title', 'client_name', 'stage_name', 'value', 'created_at', 'responsible']);
        }
    }, []);

    const handleColumnOrderChange = (newOrder: string[]) => {
        setColumnOrder(newOrder);
        localStorage.setItem('crm-list-config-v2', JSON.stringify({ order: newOrder }));
    };
    const [draftSearchTerm, setDraftSearchTerm] = useState("");

    // SYNC DRAFT WITH ACTIVE (Only when preferences load or on mount)
    useEffect(() => {
        setDraftFilters(activeFilters);
        setDraftSearchTerm(searchTerm);
    }, [activeFilters, searchTerm]);

    useEffect(() => {
        setDraftVisibleFields(visibleFields);
    }, [visibleFields]);

    // Map active filters for backend consumption
    const filterParams = useMemo(() => {
        const params: any = {};
        activeFilters.forEach(f => {
            if (f.id === 'creationDate') {
                params.startDate = f.value?.from ? format(new Date(f.value.from), 'yyyy-MM-dd') : undefined;
                params.endDate = f.value?.to ? format(new Date(f.value.to), 'yyyy-MM-dd') : undefined;
            } else if (f.id === 'accountOpeningDate') {
                params.openAccountStartDate = f.value?.from ? format(new Date(f.value.from), 'yyyy-MM-dd') : undefined;
                params.openAccountEndDate = f.value?.to ? format(new Date(f.value.to), 'yyyy-MM-dd') : undefined;
            } else if (f.id === 'responsibleId') {
                params.responsible_id = f.value;
            } else {
                params[f.id] = f.value;
            }
        });
        return params;
    }, [activeFilters]);

    // Initial Preferences Load
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);

            if (parsedUser.role === 'OPERATOR') {
                window.location.href = '/new-client';
                return;
            }
            fetchPresets(parsedUser.id);
        }
        fetchPipelines();
        fetchFiltersData();
    }, []);

    // Load Preferences from DB when pipeline is selected
    useEffect(() => {
        if (selectedPipeline && currentUser) {
            fetchUserPreferences(selectedPipeline);
        }
    }, [selectedPipeline, currentUser]);

    const fetchUserPreferences = async (pipelineId: string) => {
        try {
            const res = await api.get(`/kanban-preferences?pipelineId=${pipelineId}`);
            if (res.data) {
                const prefs = res.data;
                setViewMode(prefs.view_mode as 'board' | 'list');
                setPageSize(prefs.page_size || 25);

                if (Array.isArray(prefs.visible_fields) && prefs.visible_fields.length > 0) {
                    setVisibleFields(prefs.visible_fields);
                }

                if (prefs.filters_config && Object.keys(prefs.filters_config).length > 0) {
                    const filters = Object.entries(prefs.filters_config).map(([id, value]) => ({ id, value }));
                    setActiveFilters(filters);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar preferências:", error);
        } finally {
            setIsInitialLoading(false);
        }
    };

    const saveUserPreferences = async (updates: any) => {
        if (!selectedPipeline || !currentUser) return;
        try {
            await api.put(`/kanban-preferences?pipelineId=${selectedPipeline}`, updates);
        } catch (error) {
            console.error("Erro ao salvar preferências:", error);
        }
    };

    // Auto-save view mode and page size with debounce
    useEffect(() => {
        if (isInitialLoading) return;
        const timer = setTimeout(() => {
            saveUserPreferences({
                view_mode: viewMode,
                page_size: pageSize,
                visible_fields: visibleFields,
                filters_config: filterParams // Current applied filters
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [viewMode, pageSize]);

    const handleApplyFilters = () => {
        setActiveFilters(draftFilters);
        setVisibleFields(draftVisibleFields);
        setSearchTerm(draftSearchTerm);
        // Save current config to DB
        const config: any = {};
        draftFilters.forEach(f => {
            config[f.id] = f.value;
        });
        saveUserPreferences({
            filters_config: config,
            visible_fields: draftVisibleFields
        });
    };

    const fetchMetrics = useCallback(async () => {
        setMetricsLoading(true);
        try {
            const params: any = { ...filterParams };
            if (selectedPipeline) params.pipelineId = selectedPipeline;
            if (searchTerm) params.search = searchTerm;

            const res = await api.get('/clients/dashboard-metrics', { params });
            setMetrics(res.data);
        } catch (error) {
            console.error("Erro ao carregar métricas:", error);
        } finally {
            setMetricsLoading(false);
        }
    }, [filterParams, selectedPipeline, searchTerm]);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !selectedPipeline) return;

        socket.emit('kanban:join', selectedPipeline);

        const handleDealMoved = (deal: Deal) => {
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
    }, [socket, selectedPipeline, fetchMetrics]);

    const fetchFiltersData = async () => {
        try {
            const [usersRes, tabsRes] = await Promise.all([
                api.get('/users'),
                api.get('/tabulations/active')
            ]);

            // Sort users alphabetically
            const sortedUsers = Array.isArray(usersRes.data)
                ? usersRes.data.sort((a, b) => a.name.localeCompare(b.name))
                : [];

            setUsers(sortedUsers);

            if (Array.isArray(tabsRes.data)) {
                // Ensure tabulations are also sorted and extracted (assuming tabsRes.data is [{label: '...'}, ...])
                const tabOptions = tabsRes.data.map((t: any) => t.label).sort((a, b) => a.localeCompare(b));
                setTabulationOptions(tabOptions);
            }
        } catch (error) {
            console.error("Erro ao carregar filtros:", error);
        }
    };

    // Reactive Data Fetch (Update when filters change)
    useEffect(() => {
        if (!selectedPipeline) return;

        const timer = setTimeout(() => {
            fetchMetrics();
            fetchStagesAndDeals(selectedPipeline);
        }, 500);
        return () => clearTimeout(timer);
    }, [selectedPipeline, searchTerm, filterParams, fetchMetrics]);

    const fetchPresets = async (userId: string) => {
        try {
            const res = await api.get(`/kanban/filter-presets`);
            setPresets(res.data);
        } catch (error) { console.error("Erro ao buscar presets:", error); }
    };

    const handleSavePreset = async (name: string) => {
        if (!currentUser) return;
        try {
            const res = await api.post('/kanban/filter-presets', {
                name,
                config_json: {
                    filters: activeFilters,
                    visible_fields: visibleFields
                }
            });
            setPresets(prev => [res.data, ...prev]);
            toast({ title: "Filtro salvo com sucesso" });
        } catch (error) { toast({ title: "Erro ao salvar filtro", variant: "destructive" }); }
    };

    const handleDeletePreset = async (id: string) => {
        try {
            await api.delete(`/kanban/filter-presets/${id}`);
            setPresets(prev => prev.filter(p => p.id !== id));
            toast({ title: "Filtro removido" });
        } catch (error) { toast({ title: "Erro ao remover filtro", variant: "destructive" }); }
    };

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
            const params: any = { pipeline_id: pipelineId, ...filterParams };
            if (searchTerm) params.search = searchTerm;

            const [stagesRes, dealsRes, countsRes] = await Promise.all([
                api.get(`/stages?pipeline_id=${pipelineId}`),
                api.get(`/deals`, { params }),
                api.get(`/deals/counts-by-stage`, { params }) // Backend handles count filters now
            ]);

            setStages(stagesRes.data);
            setStageCounts(countsRes.data);

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
            await api.patch(`/deals/${dealId}`, { responsible_id: userId });
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
            // FE filtering is minimal now as backend handles most params
            filteredDealsByStage[stage.id] = stageDeals;
        });
        return filteredDealsByStage;
    }, [deals, stages]);

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
                            tabulationOptions={tabulationOptions}
                            searchTerm={draftSearchTerm}
                            onSearchChange={setDraftSearchTerm}
                            activeFilters={draftFilters}
                            visibleFields={draftVisibleFields}
                            onFilterChange={(id, value) => {
                                setDraftFilters(prev => {
                                    const existing = prev.find(f => f.id === id);
                                    const next = existing
                                        ? prev.map(f => f.id === id ? { ...f, value } : f)
                                        : [...prev, { id, value }];
                                    return next.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
                                });
                            }}
                            onRemoveField={(id) => {
                                setDraftVisibleFields(prev => prev.filter(f => f !== id));
                                setDraftFilters(prev => prev.filter(f => f.id !== id));
                            }}
                            onAddField={(id) => {
                                if (!draftVisibleFields.includes(id)) {
                                    setDraftVisibleFields(prev => [...prev, id]);
                                }
                            }}
                            onClearAll={() => {
                                setDraftFilters([]);
                                setActiveFilters([]); // Also clear applied filters for immediate feedback? 
                                // Actually better to just clear draft and then user clicks apply.
                                // But "Clear All" usually implies immediate reset.
                                clearAll();
                            }}
                            onApply={handleApplyFilters}
                            presets={presets}
                            onSavePreset={handleSavePreset}
                            onDeletePreset={handleDeletePreset}
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

                        {viewMode === 'list' && (
                            <ExportButton
                                pipelineId={selectedPipeline || undefined}
                                filters={{ ...filterParams, search: searchTerm }}
                                visibleColumns={columnOrder}
                                className="h-9 font-medium shadow-sm"
                                variant="outline"
                            />
                        )}

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
                        columnOrder={columnOrder}
                        onColumnOrderChange={handleColumnOrderChange}
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
