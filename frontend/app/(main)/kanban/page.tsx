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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    stage_entered_at?: string;
    sla_due_date?: string | null;
    is_overdue?: boolean;
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
    stage?: { sla_minutes?: number };
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
    const [stalledByStage, setStalledByStage] = useState<Record<string, { stalled: number; total: number; sla_minutes: number }>>({});
    const [showOnlyStalled, setShowOnlyStalled] = useState(false);
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

    const totalStalledCount = useMemo(
        () => Object.values(stalledByStage).reduce((sum, item) => sum + Number(item?.stalled || 0), 0),
        [stalledByStage],
    );
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
    const leadRegistrationEnabled = currentUser?.system_settings?.lead_registration_enabled !== false;
    const canCreateLead =
        currentUser?.role === 'ADMIN' ||
        (Array.isArray(currentUser?.permissions) && currentUser.permissions.includes('crm.create_lead'));
    const canAccessNewClient = Boolean(leadRegistrationEnabled && canCreateLead);

    const INITIAL_STAGE_PAGE_SIZE = 80;
    const [loadingMoreByStage, setLoadingMoreByStage] = useState<Record<string, boolean>>({});

    // SYNC DRAFT WITH ACTIVE (Only when preferences load or on mount)
    useEffect(() => {
        setDraftFilters(activeFilters);
        setDraftSearchTerm(searchTerm);
    }, [activeFilters, searchTerm]);

    useEffect(() => {
        setDraftVisibleFields(visibleFields);
    }, [visibleFields]);

    // Auto-apply search term after user stops typing (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(draftSearchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [draftSearchTerm]);

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
                params.responsible_id = Array.isArray(f.value) ? f.value.join(',') : f.value;
            } else if (f.id === 'tabulation') {
                params.tabulation = Array.isArray(f.value) ? f.value.join(',') : f.value;
            } else {
                params[f.id] = f.value;
            }
        });
        return params;
    }, [activeFilters]);

    // Refs para fetchMetrics usar sempre os valores mais recentes
    // sem precisar declará-los como deps do useCallback (evita re-registro do WS a cada tecla)
    const filterParamsRef = useRef(filterParams);
    const searchTermRef = useRef(searchTerm);
    useEffect(() => { filterParamsRef.current = filterParams; }, [filterParams]);
    useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);

    // Initial Preferences Load
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);

            if (parsedUser.role === 'OPERATOR') {
                const canOperatorCreateLead =
                    parsedUser?.role === 'ADMIN' ||
                    (Array.isArray(parsedUser?.permissions) && parsedUser.permissions.includes('crm.create_lead'));
                const operatorLeadRegistrationEnabled = parsedUser?.system_settings?.lead_registration_enabled !== false;
                router.push(canOperatorCreateLead && operatorLeadRegistrationEnabled ? '/new-client' : '/pull-leads');
                return;
            }
            fetchPresets(parsedUser.id);
        }

        api.get('/auth/me')
            .then((res) => {
                if (res.data?.id) {
                    const refreshedUser = {
                        ...(storedUser ? JSON.parse(storedUser) : {}),
                        ...res.data,
                        permissions: Array.isArray(res.data?.permissions) ? res.data.permissions : [],
                        system_settings: res.data?.system_settings || {},
                    };
                    setCurrentUser(refreshedUser);
                    localStorage.setItem('user', JSON.stringify(refreshedUser));
                }
            })
            .catch((error) => {
                console.error('Erro ao atualizar permissões do usuário no Kanban:', error);
            });

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

                // Restore persisted filters from DB
                if (prefs.filters_config && typeof prefs.filters_config === 'object') {
                    const restoredFilters = Object.entries(prefs.filters_config as Record<string, any>)
                        .filter(([_, v]) => {
                            if (v === null || v === undefined || v === '') return false;
                            if (Array.isArray(v) && v.length === 0) return false;
                            return true;
                        })
                        .map(([id, value]) => ({ id, value }));
                    setActiveFilters(restoredFilters);
                } else {
                    setActiveFilters([]);
                }
                setSearchTerm('');
                setDraftSearchTerm('');
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
            const config: any = {};
            activeFilters.forEach(f => { config[f.id] = f.value; });
            saveUserPreferences({
                view_mode: viewMode,
                page_size: pageSize,
                visible_fields: visibleFields,
                filters_config: config
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
            const params: any = { ...filterParamsRef.current };
            if (selectedPipeline) params.pipelineId = selectedPipeline;
            if (searchTermRef.current) params.search = searchTermRef.current;

            const res = await api.get('/clients/dashboard-metrics', { params });
            setMetrics(res.data);
        } catch (error) {
            console.error("Erro ao carregar métricas:", error);
        } finally {
            setMetricsLoading(false);
        }
    }, [selectedPipeline]);

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
    }, [selectedPipeline, searchTerm, filterParams, fetchMetrics, viewMode]);

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

    const normalizeDealSla = (deal: Deal): Deal => {
        const now = Date.now();
        const dueAt = deal.sla_due_date ? new Date(deal.sla_due_date).getTime() : null;
        const stageSlaMinutes = Number(deal.stage?.sla_minutes || 0);
        const enteredAt = deal.stage_entered_at
            ? new Date(deal.stage_entered_at).getTime()
            : new Date(deal.created_at).getTime();

        let overdue = Boolean(deal.is_overdue);
        if (dueAt) {
            overdue = dueAt < now;
        } else if (stageSlaMinutes > 0) {
            overdue = (now - enteredAt) > (stageSlaMinutes * 60 * 1000);
        }

        return {
            ...deal,
            is_overdue: overdue,
        };
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
            const baseParams: any = { pipeline_id: pipelineId, ...filterParams };
            if (searchTerm) baseParams.search = searchTerm;

            const [stagesRes, countsRes, stalledRes] = await Promise.all([
                api.get(`/stages?pipeline_id=${pipelineId}`),
                api.get(`/deals/counts-by-stage`, { params: baseParams }),
                api.get(`/deals/stalled-by-stage`, { params: baseParams }),
            ]);

            setStages(stagesRes.data);
            setStageCounts(countsRes.data);
            setStalledByStage(stalledRes.data || {});

            if (viewMode === 'list') {
                const dealsRes = await api.get(`/deals`, { params: baseParams });
                const dealsByStage: Record<string, Deal[]> = {};
                stagesRes.data.forEach((stage: Stage) => {
                    dealsByStage[stage.id] = [];
                });
                dealsRes.data.forEach((rawDeal: Deal) => {
                    const deal = normalizeDealSla(rawDeal);
                    if (dealsByStage[deal.stage_id]) {
                        dealsByStage[deal.stage_id].push(deal);
                    }
                });
                setDeals(dealsByStage);
                return;
            }

            const stageRequests = stagesRes.data.map((stage: Stage) =>
                api.get(`/deals`, {
                    params: {
                        ...baseParams,
                        stage_id: stage.id,
                        skip: 0,
                        take: INITIAL_STAGE_PAGE_SIZE,
                    },
                })
            );

            const stageResponses = await Promise.all(stageRequests);
            const dealsByStage: Record<string, Deal[]> = {};

            stagesRes.data.forEach((stage: Stage, index: number) => {
                const stageChunk = stageResponses[index].data || [];
                dealsByStage[stage.id] = stageChunk.filter((deal: Deal) => deal.stage_id === stage.id);
            });

            setDeals(dealsByStage);

        } catch (error) {
            console.error("Erro ao buscar dados do kanban:", error);
        }
    };

    const loadMoreDealsByStage = async (stageId: string) => {
        if (!selectedPipeline) return;
        if (loadingMoreByStage[stageId]) return;

        const currentlyLoaded = (deals[stageId] || []).length;
        const totalForStage = stageCounts[stageId] || 0;
        if (currentlyLoaded >= totalForStage) return;

        setLoadingMoreByStage(prev => ({ ...prev, [stageId]: true }));

        try {
            const params: any = {
                pipeline_id: selectedPipeline,
                stage_id: stageId,
                skip: currentlyLoaded,
                take: INITIAL_STAGE_PAGE_SIZE,
                ...filterParams,
            };

            if (searchTerm) params.search = searchTerm;

            const res = await api.get('/deals', { params });
            const nextChunk = (res.data || []).map((deal: Deal) => normalizeDealSla(deal)).filter((deal: Deal) => deal.stage_id === stageId);

            setDeals(prev => ({
                ...prev,
                [stageId]: [...(prev[stageId] || []), ...nextChunk],
            }));
        } catch (error) {
            console.error('Erro ao carregar mais deals da coluna:', error);
        } finally {
            setLoadingMoreByStage(prev => ({ ...prev, [stageId]: false }));
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
            filteredDealsByStage[stage.id] = showOnlyStalled
                ? stageDeals.filter((deal) => Boolean(deal.is_overdue))
                : stageDeals;
        });
        return filteredDealsByStage;
    }, [deals, stages, showOnlyStalled]);

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

                        <Select value={selectedPipeline || ""} onValueChange={setSelectedPipeline}>
                            <SelectTrigger className="h-9 min-w-[150px] max-w-[220px] border-0 bg-transparent text-sm font-semibold text-foreground">
                                <SelectValue placeholder="Selecione o funil" />
                            </SelectTrigger>
                            <SelectContent>
                                {pipelines.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <button
                            onClick={() => setIsConfigModalOpen(true)}
                            title="Configurar visualização dos cards"
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                            <Settings2 size={16} />
                        </button>

                        {showOnlyStalled && (
                            <button
                                type="button"
                                onClick={() => setShowOnlyStalled(false)}
                                className="h-7 px-2 rounded border border-red-500/40 bg-red-500/10 text-red-500 text-xs font-medium"
                                title="Remover filtro de parados"
                            >
                                Somente parados ({totalStalledCount})
                            </button>
                        )}
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
                                    return next.filter(f => {
                            if (f.value === null || f.value === undefined || f.value === '') return false;
                            if (Array.isArray(f.value) && f.value.length === 0) return false;
                            return true;
                        });
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

                        {canAccessNewClient && (
                        <button
                            onClick={() => router.push('/new-client')}
                            className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground border border-transparent rounded-md flex items-center gap-2 hover:bg-primary/90 transition shadow-sm"
                        >
                            <Plus size={16} /> <span className="hidden lg:inline">Novo Negócio</span>
                        </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white">
                {!isInitialLoading && stages.length > 0 && Object.values(filteredDeals).every(d => d.length === 0) && (searchTerm || activeFilters.length > 0 || showOnlyStalled) ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <span className="text-4xl">🔍</span>
                        <p className="text-base font-medium">Nenhum negócio encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros ou o termo de busca</p>
                    </div>
                ) : viewMode === 'board' ? (
                    <KanbanBoard
                        stages={stages}
                        dealsByStage={filteredDeals}
                        totalCounts={stageCounts}
                        stalledByStage={stalledByStage}
                        onStalledClick={() => setShowOnlyStalled((prev) => !prev)}
                        stalledFilterActive={showOnlyStalled}
                        onDragEnd={onDragEnd}
                        onDealClick={setSelectedDealId}
                        cardConfig={cardConfig}
                        users={users}
                        onResponsibleChange={handleResponsibleChange}
                        loadingMoreByStage={loadingMoreByStage}
                        onLoadMore={loadMoreDealsByStage}
                        isOperator={currentUser?.role === 'OPERATOR'}
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










