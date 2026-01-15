import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Calendar, Phone, Mail, X, CheckCircle } from 'lucide-react';

interface Appointment {
    clientName: string; // Razão Social
    contactName: string; // Nome do contato
    clientId: string;
    scheduleTime: string;
    phone: string;
    email: string;
    cnpj: string;
}

interface AppointmentNotificationProps {
    onViewClient: (clientId: string) => void;
}

export default function AppointmentNotification({ onViewClient }: AppointmentNotificationProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkAppointments = async () => {
            try {
                const res = await api.get('/clients/notifications');
                if (res.data && res.data.length > 0) {
                    setAppointments(res.data);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error("Failed to check notifications", error);
            }
        };

        checkAppointments();
        const interval = setInterval(checkAppointments, 30000);

        return () => clearInterval(interval);
    }, []);

    if (!isOpen || appointments.length === 0) return null;

    const currentAppointment = appointments[0];

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleAction = () => {
        setIsOpen(false);
        onViewClient(currentAppointment.clientId);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center sm:justify-end px-4 py-6 pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl border border-indigo-100 p-6 pointer-events-auto transform transition-all animate-in slide-in-from-right duration-300 max-w-md w-full bg-white backdrop-blur-md">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2.5 rounded-full">
                            <Calendar className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">Notificação de agendamento</h3>
                            <p className="text-sm text-indigo-600 font-medium">Retornar ligação agora</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mb-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Razão Social</p>
                        <p className="text-lg font-bold text-gray-900 leading-snug">{currentAppointment.clientName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Nome do Cliente</p>
                            <p className="font-medium text-gray-700 truncate" title={currentAppointment.contactName}>{currentAppointment.contactName || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">CNPJ</p>
                            <p className="font-medium text-gray-700 font-mono tracking-tight">{currentAppointment.cnpj || '-'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-800">{currentAppointment.phone || 'Sem telefone'}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleAction}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-200"
                    >
                        Ver Cliente <CheckCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
