'use client';

import { ArrowRightLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LeadTransferButtonProps {
    userRole: string;
}

export function LeadTransferButton({ userRole }: LeadTransferButtonProps) {
    const router = useRouter();

    if (userRole !== 'OPERATOR') return null;

    return (
        <button
            onClick={() => router.push('/pull-leads')}
            className="bg-primary hover:bg-green-400 text-primary-foreground p-3 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center w-14 h-14 group relative"
            title="Puxar Lead por CNPJ"
        >
            <ArrowRightLeft className="h-6 w-6" />
            <span className="absolute right-16 bg-popover text-popover-foreground border border-border text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                Puxar Lead
            </span>
        </button>
    );
}
