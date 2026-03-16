'use client';

import { useEffect, useState } from 'react';
import ClientRegistrationForm from '@/components/clients/ClientRegistrationForm';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function NewClientPage() {
    const router = useRouter();
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await api.get('/auth/me');
                const leadRegistrationEnabled = res.data?.system_settings?.lead_registration_enabled !== false;
                const permissions = Array.isArray(res.data?.permissions) ? res.data.permissions : [];
                const canCreateLead = res.data?.role === 'ADMIN' || permissions.includes('crm.create_lead');
                if (!leadRegistrationEnabled || !canCreateLead) {
                    router.replace('/pull-leads');
                    return;
                }
                setAllowed(true);
            } catch (error) {
                console.error('Erro ao validar acesso ao cadastro:', error);
                router.replace('/login');
            }
        };

        checkAccess();
    }, [router]);

    if (allowed === null) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <ClientRegistrationForm onSuccess={(clientId) => router.push(`/clients/${clientId}/qualify`)} onCancel={() => router.back()} />
        </div>
    );
}
