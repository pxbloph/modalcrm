import React, { useState, useEffect } from 'react';
import {
    format,
    subDays,
    addDays,
    startOfWeek,
    endOfWeek,
    subWeeks,
    addWeeks,
    startOfMonth,
    endOfMonth,
    subMonths,
    addMonths,
    startOfQuarter,
    endOfQuarter,
    subQuarters,
    addQuarters,
    startOfYear,
    endOfYear,
    isValid,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown } from 'lucide-react';

interface SmartDateFilterProps {
    label: string;
    startDate?: string;
    endDate?: string;
    onFilterChange: (start: string, end: string) => void;
}

type PresetType =
    | 'any'
    | 'yesterday' | 'today' | 'tomorrow'
    | 'this_week' | 'last_week' | 'next_week'
    | 'this_month' | 'last_month' | 'next_month'
    | 'this_quarter' | 'last_quarter' | 'next_quarter'
    | 'this_year'
    | 'last_7' | 'last_30' | 'last_60' | 'last_90'
    | 'last_n' | 'next_n'
    | 'exact_date' | 'custom_range';

export function SmartDateFilter({ label, startDate, endDate, onFilterChange }: SmartDateFilterProps) {
    const [selectedPreset, setSelectedPreset] = useState<PresetType>('any');
    const [nValue, setNValue] = useState<string>('');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Initial load sync - try to detect preset or default to custom/any
    useEffect(() => {
        if (!startDate && !endDate) {
            setSelectedPreset('any');
        } else {
            // If has dates but no user interaction yet, logic could be added to reverse-engineer preset
            // For now, if dates exist coming from URL, we might show 'custom_range' or 'exact_date' if they match
            // simple check: if start === end, it's exact_date
            if (startDate && endDate && startDate === endDate) {
                setSelectedPreset('exact_date');
                setCustomStart(startDate);
            } else if (startDate || endDate) {
                setSelectedPreset('custom_range');
                setCustomStart(startDate || '');
                setCustomEnd(endDate || '');
            }
        }
    }, []);
    // Intentionally empty dep array to only run on mount/first render logic, 
    // avoiding overwrite user selection if parent updates props. 
    // Actually, good practice to sync if parent changes, but loop risk.

    const handlePresetChange = (preset: PresetType) => {
        setSelectedPreset(preset);

        const today = new Date();
        let start: Date | null = null;
        let end: Date | null = null;

        switch (preset) {
            case 'any':
                start = null;
                end = null;
                break;
            case 'today':
                start = today;
                end = today;
                break;
            case 'yesterday':
                start = subDays(today, 1);
                end = subDays(today, 1);
                break;
            case 'tomorrow':
                start = addDays(today, 1);
                end = addDays(today, 1);
                break;
            case 'this_week':
                start = startOfWeek(today, { locale: ptBR });
                end = endOfWeek(today, { locale: ptBR });
                break;
            case 'last_week':
                const lastWeek = subWeeks(today, 1);
                start = startOfWeek(lastWeek, { locale: ptBR });
                end = endOfWeek(lastWeek, { locale: ptBR });
                break;
            case 'next_week':
                const nextWeek = addWeeks(today, 1);
                start = startOfWeek(nextWeek, { locale: ptBR });
                end = endOfWeek(nextWeek, { locale: ptBR });
                break;
            case 'this_month':
                start = startOfMonth(today);
                end = endOfMonth(today);
                break;
            case 'last_month':
                const lastMonth = subMonths(today, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            case 'next_month':
                const nextMonth = addMonths(today, 1);
                start = startOfMonth(nextMonth);
                end = endOfMonth(nextMonth);
                break;
            case 'this_quarter':
                start = startOfQuarter(today);
                end = endOfQuarter(today);
                break;
            case 'last_quarter':
                const lastQ = subQuarters(today, 1);
                start = startOfQuarter(lastQ);
                end = endOfQuarter(lastQ);
                break;
            case 'next_quarter':
                const nextQ = addQuarters(today, 1);
                start = startOfQuarter(nextQ);
                end = endOfQuarter(nextQ);
                break;
            case 'this_year':
                start = startOfYear(today);
                end = endOfYear(today);
                break;
            case 'last_7':
                start = subDays(today, 6); // Include today
                end = today;
                break;
            case 'last_30':
                start = subDays(today, 29);
                end = today;
                break;
            case 'last_60':
                start = subDays(today, 59);
                end = today;
                break;
            case 'last_90':
                start = subDays(today, 89);
                end = today;
                break;
            // Inputs require manual trigger or effect
            case 'last_n':
            case 'next_n':
            case 'exact_date':
            case 'custom_range':
                // Do not apply immediately, wait for input
                return;
            default:
                break;
        }

        if (start && end) {
            onFilterChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
        } else if (preset === 'any') {
            onFilterChange('', '');
        }
    };

    const handleNChange = (val: string) => {
        setNValue(val);
        const days = parseInt(val, 10);
        if (isNaN(days) || days <= 0) return;

        const today = new Date();
        let start: Date | null = null;
        let end: Date | null = null;

        if (selectedPreset === 'last_n') {
            start = subDays(today, days - 1);
            end = today;
        } else if (selectedPreset === 'next_n') {
            start = today;
            end = addDays(today, days);
        }

        if (start && end) {
            onFilterChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
        }
    };

    const handleDateInput = (val: string, type: 'start' | 'end' | 'exact') => {
        if (type === 'exact') {
            setCustomStart(val);
            setCustomEnd(val);
            if (val) onFilterChange(val, val);
        } else {
            const newStart = type === 'start' ? val : customStart;
            const newEnd = type === 'end' ? val : customEnd;

            if (type === 'start') setCustomStart(val);
            if (type === 'end') setCustomEnd(val);

            // Only apply if we have a valid range or at least one date?
            // Usually 'custom_range' implies we want what is typed.
            onFilterChange(newStart, newEnd);
        }
    };

    const PRESETS: { [key: string]: string } = {
        'any': 'Qualquer data',
        'yesterday': 'Ontem',
        'today': 'Hoje',
        'tomorrow': 'Amanhã',
        'this_week': 'Esta semana',
        'last_week': 'Semana passada',
        'next_week': 'Próxima semana',
        'this_month': 'Este mês',
        'last_month': 'Mês passado',
        'next_month': 'Próximo mês',
        'this_quarter': 'Trimestre atual',
        'last_quarter': 'Trimestre passado',
        'next_quarter': 'Próximo trimestre',
        'this_year': 'Este ano',
        'last_7': 'Últimos 7 dias',
        'last_30': 'Últimos 30 dias',
        'last_60': 'Últimos 60 dias',
        'last_90': 'Últimos 90 dias',
        'last_n': 'Últimos N dias',
        'next_n': 'Próximos N dias',
        'exact_date': 'Data exata',
        'custom_range': 'Intervalo personalizado'
    };

    return (
        <div className="w-full">
            <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">
                {label}
            </label>
            <div className="space-y-2">
                <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value as PresetType)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                >
                    {Object.entries(PRESETS).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                    ))}
                </select>

                {/* Conditional Inputs */}
                {(selectedPreset === 'last_n' || selectedPreset === 'next_n') && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                        <input
                            type="number"
                            value={nValue}
                            onChange={(e) => handleNChange(e.target.value)}
                            placeholder="Número de dias"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                        />
                    </div>
                )}

                {selectedPreset === 'exact_date' && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => handleDateInput(e.target.value, 'exact')}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                        />
                    </div>
                )}

                {selectedPreset === 'custom_range' && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => handleDateInput(e.target.value, 'start')}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                            />
                        </div>
                        <div className="flex-1">
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => handleDateInput(e.target.value, 'end')}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-gray-100"
                            />
                        </div>
                    </div>
                )}
            </div>
            {/* Display active filter text optionally? No, user sees the inputs/selection */}
        </div>
    );
}
