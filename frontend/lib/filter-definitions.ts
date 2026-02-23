export type FilterFieldType = 'text' | 'select' | 'date-range' | 'boolean' | 'user';

export interface FilterField {
    id: string;
    label: string;
    type: FilterFieldType;
    placeholder?: string;
    options?: { value: string; label: string }[];
}

export const FILTER_FIELDS: FilterField[] = [
    {
        id: 'creationDate',
        label: 'Data de Criação',
        type: 'date-range',
    },
    {
        id: 'accountOpeningDate',
        label: 'Data de Abertura de Conta',
        type: 'date-range',
    },
    {
        id: 'responsibleId',
        label: 'Responsável',
        type: 'user',
    },
    {
        id: 'tabulation',
        label: 'Tabulação',
        type: 'select',
    },
    {
        id: 'hasOpenAccount',
        label: 'Possui Conta Aberta',
        type: 'boolean',
    },
    {
        id: 'isQualified',
        label: 'Qualificado',
        type: 'boolean',
    },
    {
        id: 'faturamento_mensal',
        label: 'Faturamento Mensal',
        type: 'text', // Could be numeric range later
    },
    {
        id: 'maquininha_atual',
        label: 'Maquininha Atual',
        type: 'text',
    }
];
