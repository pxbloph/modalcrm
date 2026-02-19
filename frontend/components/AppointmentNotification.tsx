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
            <div className="bg-card rounded-lg shadow-xl border border-border p-6 pointer-events-auto transform transition-all animate-in slide-in-from-right duration-300 max-w-md w-full backdrop-blur-md">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-full">
                            <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground leading-tight">Notificação de agendamento</h3>
                            <p className="text-sm text-primary font-medium">Retornar ligação agora</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="bg-muted p-4 rounded-xl border border-border space-y-3 mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Razão Social</p>
                        <p className="text-lg font-bold text-foreground leading-snug">{currentAppointment.clientName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Nome do Cliente</p>
                            <p className="font-medium text-foreground truncate" title={currentAppointment.contactName}>{currentAppointment.contactName || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">CNPJ</p>
                            <p className="font-medium text-foreground font-mono tracking-tight">{currentAppointment.cnpj || '-'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{currentAppointment.phone || 'Sem telefone'}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-background border border-input rounded-lg hover:bg-accent transition-colors shadow-sm"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleAction}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                        Ver Cliente <CheckCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
