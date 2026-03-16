'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');

        if (!storedUser || storedUser === 'undefined') {
            router.push('/login');
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            const leadRegistrationEnabled = user?.system_settings?.lead_registration_enabled !== false;
            const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
            const canCreateLead = user?.role === 'ADMIN' || permissions.includes('crm.create_lead');

            const resolveOperatorRoute = () => {
                switch (user?.initial_page) {
                    case 'LEAD_PULL':
                        return '/pull-leads';
                    case 'KANBAN':
                        return '/kanban';
                    case 'NEW_CLIENT':
                        return leadRegistrationEnabled && canCreateLead ? '/new-client' : '/pull-leads';
                    default:
                        return leadRegistrationEnabled && canCreateLead ? '/new-client' : '/pull-leads';
                }
            };

            if (user.role === 'OPERATOR') {
                router.push(resolveOperatorRoute());
            } else {
                router.push('/kanban');
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            router.push('/login');
        } finally {
            // Keep loading true while redirecting to prevent flash
        }
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}
