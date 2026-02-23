import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FILTER_FIELDS } from '@/lib/filter-definitions';

export interface FilterValue {
    id: string;
    value: any;
}

export function useKanbanFilters() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [activeFilters, setActiveFilters] = useState<FilterValue[]>([]);
    const [visibleFields, setVisibleFields] = useState<string[]>(['responsibleId', 'tabulation', 'creationDate']);

    // Sync URL -> State (Initial only to avoid loops)
    useEffect(() => {
        const filters: FilterValue[] = [];
        searchParams.forEach((value, key) => {
            const field = FILTER_FIELDS.find(f => f.id === key);
            if (field) {
                let parsedValue: any = value;
                if (field.type === 'date-range' || field.type === 'boolean') {
                    try {
                        parsedValue = JSON.parse(value);
                    } catch (e) {
                        // Keep as string if parsing fails
                    }
                }
                filters.push({ id: key, value: parsedValue });
                if (!visibleFields.includes(key)) {
                    setVisibleFields(prev => Array.from(new Set([...prev, key])));
                }
            }
        });
        if (filters.length > 0) {
            setActiveFilters(filters);
        }
    }, []); // Only on mount

    const updateURL = useCallback((filters: FilterValue[]) => {
        const params = new URLSearchParams();
        filters.forEach(f => {
            if (f.value && f.value !== '' && f.value !== null) {
                if (typeof f.value === 'object') {
                    // Handle objects like date ranges if needed, but usually they are strings in URL
                    params.set(f.id, JSON.stringify(f.value));
                } else {
                    params.set(f.id, String(f.value));
                }
            }
        });
        const queryString = params.toString();
        const currentQuery = searchParams.toString();

        if (queryString !== currentQuery) {
            router.replace(`${pathname}${queryString ? '?' + queryString : ''}`, { scroll: false });
        }
    }, [router, pathname, searchParams]);

    const setFilter = useCallback((id: string, value: any) => {
        setActiveFilters(prev => {
            const existing = prev.find(f => f.id === id);
            const next = existing
                ? prev.map(f => f.id === id ? { ...f, value } : f)
                : [...prev, { id, value }];

            const filtered = next.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
            return filtered;
        });
    }, []);

    const removeFilter = useCallback((id: string) => {
        setActiveFilters(prev => prev.filter(f => f.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setActiveFilters([]);
    }, []);

    // Sync State -> URL
    useEffect(() => {
        updateURL(activeFilters);
    }, [activeFilters, updateURL]);

    const addField = useCallback((id: string) => {
        if (!visibleFields.includes(id)) {
            setVisibleFields(prev => [...prev, id]);
        }
    }, [visibleFields]);

    const removeField = useCallback((id: string) => {
        setVisibleFields(prev => prev.filter(f => f !== id));
        removeFilter(id);
    }, [removeFilter]);

    return {
        activeFilters,
        visibleFields,
        setFilter,
        removeFilter,
        clearAll,
        addField,
        removeField,
        allFields: FILTER_FIELDS
    };
}
