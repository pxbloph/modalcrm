'use client';

import ClientRegistrationForm from '@/components/clients/ClientRegistrationForm';
import { useRouter } from 'next/navigation';

export default function NewClientPage() {
    const router = useRouter();

    return (
        <div className="max-w-2xl mx-auto">
            <ClientRegistrationForm onSuccess={(clientId) => router.push(`/dashboard/clients/${clientId}/qualify`)} onCancel={() => router.back()} />
        </div>
    );
}
