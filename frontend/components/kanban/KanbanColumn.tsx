import React, { memo, useRef, useState, useEffect } from "react";
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
    stalledCount?: number;
    onStalledClick?: () => void;
    stalledFilterActive?: boolean;
    onDealClick: (id: string) => void;
    cardConfig?: any[];
    users?: any[];
    onResponsibleChange?: (dealId: string, userId: string) => void;
    totalCount?: number;
    canLoadMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    isOperator?: boolean;
}

const VirtualList = ({ height, width, itemCount, itemSize, children: Row, itemData, className }: any) => {
    const [scrollTop, setScrollTop] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const totalHeight = itemCount * itemSize;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - 2);
    const endIndex = Math.min(
        itemCount - 1,
        Math.floor((scrollTop + height) / itemSize) + 2
    );

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
        items.push(
            <Row
                key={i}
                index={i}
                style={{
                    position: 'absolute',
                    top: i * itemSize,
                    left: 0,
                    width: '100%',
                    height: itemSize,
                }}
                data={itemData}
            />
        );
    }

    return (
        <div
            ref={scrollRef}
            className={className}
            style={{ height, width, overflowY: 'auto', position: 'relative' }}
            onScroll={onScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {items}
            </div>
        </div>
    );
};

const Row = memo(({ data, index, style }: any) => {
    const { deals, onDealClick, cardConfig, stageColor, users, onResponsibleChange, isOperator } = data;
    const deal = deals[index];

    const patchStyle = {
        ...style,
        height: (Number(style.height) || 165) - 2,
        left: Number(style.left || 0) + 4,
        width: "calc(100% - 12px)"
    };

    return (
        <div style={patchStyle}>
            <DealCard
                deal={deal}
                index={index}
                onClick={onDealClick}
                cardConfig={cardConfig}
                stageColor={stageColor}
                users={users}
                onResponsibleChange={onResponsibleChange}
                isOperator={isOperator}
            />
        </div>
    );
});

export function KanbanColumnComponent({
    stage,
    deals,
    totalValue,
    stalledCount = 0,
    onStalledClick,
    stalledFilterActive = false,
    onDealClick,
    cardConfig,
    users,
    onResponsibleChange,
    totalCount,
    canLoadMore,
    isLoadingMore,
    onLoadMore,
    isOperator,
}: KanbanColumnProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    setDimensions({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const displayCount = (totalCount !== undefined && totalCount !== deals.length)
        ? `${deals.length} / ${totalCount}`
        : deals.length;

    return (
        <div className="w-72 flex-shrink-0 flex flex-col h-full">
            <div className="p-3 flex flex-col gap-1 bg-muted/40 border-b border-border/50">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="font-semibold text-sm text-foreground truncate">{stage.name}</span>
                    </div>
                    <span className="text-xs bg-background/50 border border-border px-1.5 py-0.5 rounded text-muted-foreground font-medium" title="Exibindo / Total">
                        {displayCount}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide font-medium pl-4 pr-1">
                    <span className="text-muted-foreground">
                        {totalValue > 0 ? totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </span>
                    <button
                        type="button"
                        onClick={onStalledClick}
                        className={`rounded border px-1.5 py-0.5 text-red-500 transition-colors ${stalledFilterActive ? 'bg-red-500/20 border-red-500/50' : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'}`}
                        title="Filtrar apenas leads parados"
                    >
                        Parados: {stalledCount}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <Droppable droppableId={stage.id} type="deal">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 min-h-0 h-full w-full overflow-hidden bg-transparent transition-colors ${snapshot.isDraggingOver ? 'bg-muted/30' : ''}`}
                        >
                            <div ref={containerRef} className="w-full h-full">
                                {dimensions.height > 0 ? (
                                    <VirtualList
                                        height={dimensions.height}
                                        width={dimensions.width}
                                        itemCount={deals.length}
                                        itemSize={165}
                                        itemData={{ deals, onDealClick, cardConfig, stageColor: stage.color, users, onResponsibleChange, isOperator }}
                                        className="scrollbar-thin scrollbar-thumb-primary/20 pb-2"
                                    >
                                        {Row}
                                    </VirtualList>
                                ) : (
                                    <div className="p-4 text-xs text-muted-foreground">
                                        Carregando lista...
                                    </div>
                                )}
                            </div>
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>

            {canLoadMore && onLoadMore && (
                <div className="p-2 border-t border-border/50 bg-muted/20">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="w-full h-8 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                    </button>
                </div>
            )}
        </div>
    );
}

export const KanbanColumn = React.memo(KanbanColumnComponent);
