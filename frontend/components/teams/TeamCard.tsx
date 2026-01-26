import { Users, User, Shield, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCardProps {
    team: {
        id: string;
        name: string;
        supervisor: { name: string };
        leader?: { name: string } | null;
        _count: { members: number };
    };
    onClick: () => void;
}

export default function TeamCard({ team, onClick }: TeamCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 hover:shadow-md hover:ring-indigo-600/20 transition-all cursor-pointer overflow-hidden dark:bg-zinc-900 dark:ring-white/10 dark:hover:ring-indigo-500/30"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors" />

            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors dark:text-gray-100 dark:group-hover:text-indigo-400">
                        {team.name}
                    </h3>
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                        <Users className="h-5 w-5" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-gray-900 dark:text-gray-200">Supervisor:</span>
                        <span>{team.supervisor?.name || 'N/A'}</span>
                    </div>

                    {team.leader && (
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-gray-200">Líder:</span>
                            <span>{team.leader.name}</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between dark:border-zinc-800">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-500">Membros</span>
                    <span className="bg-gray-100 text-gray-900 py-1 px-3 rounded-full text-xs font-bold dark:bg-zinc-800 dark:text-gray-100">
                        {team._count?.members || 0}
                    </span>
                </div>
            </div>
        </div>
    );
}
