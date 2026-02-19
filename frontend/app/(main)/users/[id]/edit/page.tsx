'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        cpf: '',
        email: '',
        password: '', // Optional on edit
        role: 'OPERATOR',
        supervisor_id: ''
    });

    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const userId = params?.id as string;
                if (!userId) return;

                // Load user data
                const userRes = await api.get(`/users/${userId}`);
                const user = userRes.data;

                // Load supervisors
                const usersRes = await api.get('/users');
                const sups = usersRes.data.filter((u: any) => u.role === 'SUPERVISOR');
                setSupervisors(sups);

                setFormData({
                    name: user.name,
                    surname: user.surname || '',
                    cpf: user.cpf || '',
                    email: user.email,
                    password: '', // Don't load hash
                    role: user.role,
                    supervisor_id: user.supervisor_id || ''
                });
            } catch (err) {
                console.error(err);
                alert('Erro ao carregar dados do usuário');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const userId = params?.id as string;

        // Prepare data - remove password if empty
        const dataToSend: any = { ...formData };
        if (!dataToSend.password) {
            delete dataToSend.password;
        }
        if (dataToSend.supervisor_id === '') {
            dataToSend.supervisor_id = null; // Important to disconnect
        }

        try {
            await api.put(`/users/${userId}`, dataToSend);
            router.push('/users');
        } catch (err) {
            console.error(err);
            alert('Erro ao atualizar usuário');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Editar Usuário</h1>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-900">Nome</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900">Sobrenome</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={formData.surname}
                            onChange={e => setFormData({ ...formData, surname: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900">CPF</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900">Email</label>
                    <input
                        type="email"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900">Nova Senha (deixe em branco para manter)</label>
                    <input
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900">Função</label>
                    <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                    >
                        <option value="OPERATOR">Operador</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>

                {formData.role === 'OPERATOR' && (
                    <div>
                        <label className="block text-sm font-bold text-gray-900">Supervisor Responsável</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={formData.supervisor_id}
                            onChange={e => setFormData({ ...formData, supervisor_id: e.target.value })}
                            required
                        >
                            <option value="">Selecione um supervisor...</option>
                            {supervisors.map(sup => (
                                <option key={sup.id} value={sup.id}>{sup.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
}
