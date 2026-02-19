import React, { memo, useRef, useState, useEffect, useMemo } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
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
    cardConfig?: any[];
    users?: any[];
    onResponsibleChange?: (dealId: string, userId: string) => void;
    totalCount?: number;
}

// Custom Virtual List Implementation to replace buggy react-window
const VirtualList = ({ height, width, itemCount, itemSize, children: Row, itemData, className }: any) => {
    const [scrollTop, setScrollTop] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const totalHeight = itemCount * itemSize;
    // Calculate visible range with overscan
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
    const { deals, onDealClick, cardConfig, stageColor, users, onResponsibleChange } = data;
    const deal = deals[index];

    // Add padding to bottom for better spacing in list
    // Also adjust width to account for scrollbar or padding if needed
    const patchStyle = {
        ...style,
        height: (style.height || 140) - 8,
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
            />
        </div>
    );
});

export function KanbanColumnComponent({ stage, deals, totalValue, onDealClick, cardConfig, users, onResponsibleChange, totalCount }: KanbanColumnProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
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
            {/* Column Header */}
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
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium pl-4">
                    {totalValue > 0 ? totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                </div>
            </div>

            {/* Droppable Area */}
            <div className="flex-1 min-h-0 flex flex-col">
                <Droppable
                    droppableId={stage.id}
                    type="deal"
                >
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
                                        itemSize={140}
                                        itemData={{ deals, onDealClick, cardConfig, stageColor: stage.color, users, onResponsibleChange }}
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
        </div>
    );
}

export const KanbanColumn = React.memo(KanbanColumnComponent);
