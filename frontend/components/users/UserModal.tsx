import { useState, useEffect, useMemo } from 'react';
import { X, Shield, Mail, Lock, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomRole {
    id: string;
    name: string;
    base_role?: string | null;
    initial_page?: string | null;
}

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: any;
    customRoles?: CustomRole[];
}

const BASE_ROLE_OPTIONS = [
    { value: 'OPERATOR', label: 'Operador' },
    { value: 'LEADER', label: 'Líder' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ADMIN', label: 'Administrador' },
];

const INITIAL_PAGE_OPTIONS = [
    { value: 'DEFAULT', label: 'Padrão do usuário/role' },
    { value: 'LEAD_PULL', label: 'Puxar Leads' },
    { value: 'NEW_CLIENT', label: 'Novo Cliente' },
    { value: 'KANBAN', label: 'CRM / Kanban' },
];

export default function UserModal({ isOpen, onClose, onSuccess, userToEdit, customRoles = [] }: UserModalProps) {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [cpf, setCpf] = useState('');
    const [email, setEmail] = useState('');
    const [selectedRoleKey, setSelectedRoleKey] = useState('base:OPERATOR');
    const [initialPage, setInitialPage] = useState('DEFAULT');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    const roleOptions = useMemo(() => {
        const base = BASE_ROLE_OPTIONS.map((r) => ({
            key: `base:${r.value}`,
            label: r.label,
            role: r.value,
            security_role_id: null as string | null,
        }));

        const custom = customRoles.map((r) => ({
            key: `custom:${r.id}`,
            label: `${r.name} (Personalizada)`,
            role: r.base_role || 'OPERATOR',
            security_role_id: r.id,
        }));

        return [...base, ...custom];
    }, [customRoles]);

    useEffect(() => {
        if (!isOpen) return;

        if (userToEdit) {
            setName(userToEdit.name);
            setSurname(userToEdit.surname || '');
            setCpf(userToEdit.cpf || '');
            setEmail(userToEdit.email);
            setSelectedRoleKey(userToEdit.security_role_id ? `custom:${userToEdit.security_role_id}` : `base:${userToEdit.role || 'OPERATOR'}`);
            setInitialPage(userToEdit.initial_page || 'DEFAULT');
            setIsActive(userToEdit.is_active !== undefined ? userToEdit.is_active : true);
            setPassword('');
            return;
        }

        setName('');
        setSurname('');
        setCpf('');
        setEmail('');
        setSelectedRoleKey('base:OPERATOR');
        setInitialPage('DEFAULT');
        setPassword('');
        setIsActive(true);
    }, [isOpen, userToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const selectedRole = roleOptions.find((r) => r.key === selectedRoleKey) || roleOptions[0];

            const payload: any = {
                name,
                surname,
                cpf: cpf ? cpf : null,
                email,
                role: selectedRole?.role || 'OPERATOR',
                security_role_id: selectedRole?.security_role_id || null,
                is_active: isActive,
                initial_page: initialPage,
            };

            if (password) {
                payload.password = password;
            }

            if (userToEdit) {
                await api.put(`/users/${userToEdit.id}`, payload);
            } else {
                if (!password) {
                    alert('Senha é obrigatória para novos usuários.');
                    setLoading(false);
                    return;
                }
                await api.post('/users', payload);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving user', error);
            alert(error.response?.data?.message || 'Erro ao salvar usuário.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedRole = roleOptions.find((r) => r.key === selectedRoleKey);

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 dark:bg-zinc-900" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 sticky top-0 z-10 dark:bg-zinc-800 dark:border-zinc-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {userToEdit ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Nome</label>
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Sobrenome</label>
                            <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1 dark:text-gray-300">
                            <CreditCard className="h-3 w-3" /> CPF
                        </label>
                        <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100" placeholder="000.000.000-00" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1 dark:text-gray-300">
                            <Mail className="h-3 w-3" /> Email
                        </label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-700" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1 dark:text-gray-300">
                            <Shield className="h-3 w-3" /> Role
                        </label>
                        <Select value={selectedRoleKey} onValueChange={setSelectedRoleKey}>
                            <SelectTrigger className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100">
                                <SelectValue placeholder="Selecione a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {BASE_ROLE_OPTIONS.map((r) => (
                                    <SelectItem key={r.value} value={`base:${r.value}`}>{r.label}</SelectItem>
                                ))}
                                {customRoles.length > 0 && customRoles.map((r) => (
                                    <SelectItem key={r.id} value={`custom:${r.id}`}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedRole?.security_role_id && (
                            <p className="text-xs text-muted-foreground mt-1">Role base aplicada: {selectedRole.role}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Tela Inicial</label>
                        <Select value={initialPage} onValueChange={setInitialPage}>
                            <SelectTrigger className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-100">
                                <SelectValue placeholder="Selecione a tela inicial" />
                            </SelectTrigger>
                            <SelectContent>
                                {INITIAL_PAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {initialPage === 'DEFAULT' && selectedRole?.security_role_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Quando estiver em padrão, o usuário segue a tela inicial configurada na role personalizada.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1 dark:text-gray-300">
                            <Lock className="h-3 w-3" /> Senha {userToEdit && '(Deixe em branco para não alterar)'}
                        </label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border text-gray-700" />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:bg-zinc-700 dark:peer-focus:ring-indigo-800 dark:after:border-zinc-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Ativo</span>
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                            {loading ? 'Salvando...' : (userToEdit ? 'Salvar Alterações' : 'Criar Usuário')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
