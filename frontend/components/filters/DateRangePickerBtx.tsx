"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import {
    addDays,
    format,
    subDays,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    subWeeks,
    addWeeks,
    addMonths,
    startOfQuarter,
    endOfQuarter,
    subQuarters,
    addQuarters,
    startOfYear,
    endOfYear
} from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export type DatePreset =
    | 'any'
    | 'today' | 'yesterday' | 'tomorrow'
    | 'this_week' | 'last_week' | 'next_week'
    | 'this_month' | 'last_month' | 'next_month'
    | 'this_quarter' | 'last_quarter' | 'next_quarter'
    | 'this_year'
    | 'last_7' | 'last_30' | 'last_60' | 'last_90'
    | 'last_n' | 'next_n'
    | 'exact_date' | 'custom_range';

interface DateRangePickerBtxProps {
    date?: { from: Date | undefined; to?: Date | undefined };
    onDateChange: (range: { from: Date | undefined; to?: Date | undefined } | undefined) => void;
    label?: string;
}

const PRESETS: { value: DatePreset; label: string }[] = [
    { value: 'any', label: 'Qualquer data' },
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta semana' },
    { value: 'last_week', label: 'Semana passada' },
    { value: 'this_month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
    { value: 'this_quarter', label: 'Trimestre atual' },
    { value: 'last_7', label: 'Últimos 7 dias' },
    { value: 'last_30', label: 'Últimos 30 dias' },
    { value: 'last_60', label: 'Últimos 60 dias' },
    { value: 'last_90', label: 'Últimos 90 dias' },
    { value: 'this_year', label: 'Este ano' },
    { value: 'exact_date', label: 'Data exata' },
    { value: 'custom_range', label: 'Intervalo personalizado' },
];

export function DateRangePickerBtx({ date, onDateChange, label = "Data" }: DateRangePickerBtxProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [preset, setPreset] = React.useState<DatePreset>('any');
    const [internalDate, setInternalDate] = React.useState<{ from: Date | undefined; to?: Date | undefined } | undefined>(date);
    const [inputValue, setInputValue] = React.useState<string>(""); // For N values if implemented

    // Sync external date
    React.useEffect(() => {
        if (!date) {
            setInternalDate(undefined);
            return;
        }

        const sanitized = {
            from: date.from ? (date.from instanceof Date ? date.from : new Date(date.from)) : undefined,
            to: date.to ? (date.to instanceof Date ? date.to : new Date(date.to)) : undefined
        };

        setInternalDate(sanitized);
        // Logic to reverse-engineer preset could go here if needed, but keeping it simple for now
    }, [date]);

    const handlePresetSelect = (selected: DatePreset) => {
        setPreset(selected);
        const today = new Date();
        let range: { from: Date | undefined; to?: Date | undefined } | undefined = undefined;

        switch (selected) {
            case 'any':
                range = undefined;
                break;
            case 'today':
                range = { from: today, to: today };
                break;
            case 'yesterday':
                range = { from: subDays(today, 1), to: subDays(today, 1) };
                break;
            case 'this_week':
                range = { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) };
                break;
            case 'last_week':
                const lastWeek = subWeeks(today, 1);
                range = { from: startOfWeek(lastWeek, { locale: ptBR }), to: endOfWeek(lastWeek, { locale: ptBR }) };
                break;
            case 'this_month':
                range = { from: startOfMonth(today), to: endOfMonth(today) };
                break;
            case 'last_month':
                const lastMonth = subMonths(today, 1);
                range = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
                break;
            case 'this_quarter':
                range = { from: startOfQuarter(today), to: endOfQuarter(today) };
                break;
            case 'this_year':
                range = { from: startOfYear(today), to: endOfYear(today) };
                break;
            case 'last_7':
                range = { from: subDays(today, 6), to: today };
                break;
            case 'last_30':
                range = { from: subDays(today, 29), to: today };
                break;
            case 'last_60':
                range = { from: subDays(today, 59), to: today };
                break;
            case 'last_90':
                range = { from: subDays(today, 89), to: today };
                break;
            case 'exact_date':
            case 'custom_range':
                // Do nothing immediately, wait for calendar interaction
                // Default to current selection or empty
                range = internalDate;
                break;
        }

        if (selected !== 'exact_date' && selected !== 'custom_range') {
            onDateChange(range);
            setInternalDate(range);
            if (selected !== 'any') setIsOpen(false); // Close on direct preset selection except custom
        }
    };

    const handleCalendarSelect = (range: any) => {
        setInternalDate(range);
        if (range?.from && range?.to) {
            // If Exact Date, from and to might be same or just click twice
            onDateChange(range);
        } else if (range?.from && preset === 'exact_date') {
            // Logic for single date
            onDateChange({ from: range.from, to: range.from });
            setInternalDate({ from: range.from, to: range.from });
            setIsOpen(false);
        } else {
            // Partial range selection (only from), update internal but wait for 'to'
            onDateChange(range);
        }
    };

    const displayText = React.useMemo(() => {
        if (!date?.from) return "Qualquer data";

        // Ensure we are working with Date objects (URL params might be strings)
        const fromDate = date.from instanceof Date ? date.from : new Date(date.from);
        const toDate = date.to ? (date.to instanceof Date ? date.to : new Date(date.to)) : undefined;

        if (toDate && fromDate.getTime() === toDate.getTime()) {
            return format(fromDate, "dd/MM/yyyy", { locale: ptBR });
        }
        if (toDate) {
            return `${format(fromDate, "dd/MM/yyyy", { locale: ptBR })} - ${format(toDate, "dd/MM/yyyy", { locale: ptBR })}`;
        }
        return format(fromDate, "dd/MM/yyyy", { locale: ptBR });
    }, [date]);

    return (
        <div className={cn("grid gap-2")}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[240px] h-9 justify-start text-left font-normal bg-white dark:bg-zinc-800 shadow-sm hover:bg-gray-50 border-gray-200 dark:border-zinc-700",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                        <span className="truncate">{displayText}</span>
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        {/* Sidebar Presets */}
                        <div className="border-r border-gray-100 dark:border-zinc-800 p-2 flex flex-col gap-1 w-[180px] max-h-[350px] overflow-y-auto">
                            <span className="text-xs font-semibold text-gray-500 mb-2 px-2 pt-1">{label}</span>
                            {PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => handlePresetSelect(p.value)}
                                    className={cn(
                                        "text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                                        preset === p.value
                                            ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-300"
                                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Calendar Area */}
                        {(preset === 'custom_range' || preset === 'exact_date' || (internalDate?.from && preset === 'any')) && (
                            <div className="p-3">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={internalDate?.from}
                                    selected={internalDate}
                                    onSelect={handleCalendarSelect}
                                    numberOfMonths={2}
                                />
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
