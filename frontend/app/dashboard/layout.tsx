'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Users, LayoutDashboard, LogOut, PlusCircle, ShieldCheck, Menu, ChevronLeft, ChevronRight, Settings, BarChart, Upload, MessageCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import api from '@/lib/api';
import MobileSidebar from '@/components/layout/MobileSidebar';
import { ChatProvider } from '@/components/chat/ChatContext';
import ChatButton from '@/components/chat/ChatButton';
import { ModeToggle } from '@/components/mode-toggle';


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // State for Collapsed Sidebar
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser || storedUser === 'undefined') {
            router.push('/login');
            return;
        }
        try {
            setUser(JSON.parse(storedUser));
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user'); // Clear bad data
            router.push('/login');
        }

        // Load Sidebar Preference
        // Default to false if not set
        const collapsedPref = localStorage.getItem('sidebar-collapsed');
        if (collapsedPref === 'true') {
            setIsCollapsed(true);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
    };

    // Submenu State
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Auto-expand settings if active
    useEffect(() => {
        if (pathname.includes('/dashboard/teams') ||
            pathname.includes('/dashboard/users') ||
            pathname.includes('/dashboard/settings') ||
            pathname.includes('/dashboard/imports')) {
            setSettingsOpen(true);
        }
    }, [pathname]);

    if (!user) return null;

    const navigation = [
        {
            name: (user.role === 'ADMIN') ? 'Dashboard' : 'Meus Clientes',
            href: '/dashboard',
            icon: (user.role === 'ADMIN') ? LayoutDashboard : Users,
            show: true
        },
        {
            name: 'Relatórios',
            href: '/dashboard/reports',
            icon: BarChart,
            show: user.role === 'ADMIN' || user.role === 'SUPERVISOR'
        },
        {
            name: 'Chat',
            href: '/dashboard/chat',
            icon: MessageCircle,
            show: user.role === 'SUPERVISOR' || user.role === 'ADMIN'
        },
        {
            name: 'Novo Cliente',
            href: '/dashboard/new-client',
            icon: PlusCircle,
            show: true
        },
        {
            name: 'Kanban',
            href: '/dashboard/kanban',
            icon: LayoutDashboard, // Reusing icon for now
            show: true
        },
        {
            name: 'Configurações',
            icon: Settings,
            show: user.role === 'ADMIN' || user.role === 'SUPERVISOR', // Adjust per requirement "Admin e perfis que já têm permissão"
            // Some children are Admin only, some Supervisor too. We handle visibility per child or group.
            // Requirement says: "Somente Admin (e perfis que hoje já têm permissão)"
            // Teams/Imports -> Supervisor/Admin. Users/Qual/Reg -> Admin.
            // So Group is visible if Supervisor or Admin.
            children: [
                {
                    name: 'Gestão de Equipes',
                    href: '/dashboard/teams',
                    icon: Users,
                    show: user.role === 'SUPERVISOR' || user.role === 'ADMIN' || user.role === 'LEADER'
                },
                {
                    name: 'Importar Contas',
                    href: '/dashboard/imports/open-accounts',
                    icon: Upload,
                    show: user.role === 'ADMIN' || user.role === 'SUPERVISOR'
                },
                {
                    name: 'Gestão de Usuários',
                    href: '/dashboard/users',
                    icon: Users,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Qualificação',
                    href: '/dashboard/settings/qualification',
                    icon: Settings,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Cadastro',
                    href: '/dashboard/settings/registration',
                    icon: Settings,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Pipelines (Kanban)',
                    href: '/dashboard/settings/pipelines',
                    icon: LayoutDashboard,
                    show: user.role === 'ADMIN'
                },
            ]
        },
    ];

    const isOperator = user?.role === 'OPERATOR';

    return (
        <ChatProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex">


                <MobileSidebar
                    open={sidebarOpen}
                    setOpen={setSidebarOpen}
                    navigation={navigation}
                    onLogout={handleLogout}
                />

                {/* Sidebar Desktop */}
                {!isOperator && (
                    <div
                        className={cn(
                            "hidden md:flex flex-col fixed inset-y-0 z-50 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800/50 transition-all duration-300 ease-in-out",
                            isCollapsed ? "w-20" : "w-64"
                        )}
                    >
                        {/* Header with Toggle */}
                        <div className={cn("flex items-center h-16 shrink-0 border-b border-gray-100 dark:border-zinc-800/50 relative transition-all duration-300", isCollapsed ? "justify-center px-0" : "px-6 justify-between")}>
                            {/* 
                            AJUSTE DE TAMANHO DO LOGO:
                            Para o logo expandido (else), altere as classes 'w-40' (largura) e 'h-12' (altura).
                            Para o ícone colapsado (if), altere 'w-10' e 'h-10'.
                            Valores comuns: w-32, w-40, w-48, w-56 / h-10, h-12, h-14, h-16.
                        */}
                            <div className={cn("relative flex items-center transition-all duration-300", isCollapsed ? "w-10 h-10" : "w-40 h-12")}>
                                {isCollapsed ? (
                                    <Image
                                        src="/logo_icone.svg"
                                        alt="Modal CRM"
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                    />
                                ) : (
                                    <Image
                                        src="/logo_Logo_black.svg"
                                        alt="Modal CRM"
                                        fill
                                        className="object-contain object-left"
                                        priority
                                    />
                                )}
                            </div>

                            <button
                                onClick={toggleSidebar}
                                className={cn(
                                    "p-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-400 dark:hover:text-white",
                                    isCollapsed ? "absolute -right-3 top-6 z-50 shadow-sm" : "absolute -right-3 top-1/2 -translate-y-1/2 shadow-sm z-50"
                                )}
                                title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                            >
                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                            </button>
                        </div>

                        <div className={cn("flex flex-col gap-y-5 overflow-y-auto pb-4 pt-8 grow transition-all", isCollapsed ? "px-2" : "px-6")}>
                            <nav className="flex flex-1 flex-col">
                                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                    <li>
                                        {!isCollapsed && <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">Menu</div>}
                                        <ul role="list" className={cn("-mx-2 mt-2 space-y-1")}>
                                            {navigation.filter(item => item.show).map((item) => {
                                                if (item.children) {
                                                    const isActive = item.children.some(child => pathname === child.href);
                                                    const isOpen = settingsOpen;

                                                    return (
                                                        <li key={item.name}>
                                                            <button
                                                                onClick={() => {
                                                                    if (isCollapsed) {
                                                                        setIsCollapsed(false);
                                                                        setSettingsOpen(true);
                                                                    } else {
                                                                        setSettingsOpen(!settingsOpen);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    isActive ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white',
                                                                    'group flex w-full items-center justify-between rounded-md p-2 text-sm leading-6 font-semibold transition-all',
                                                                    isCollapsed ? "justify-center px-3" : ""
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-x-3">
                                                                    <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                                    {!isCollapsed && <span>{item.name}</span>}
                                                                </div>
                                                                {!isCollapsed && (
                                                                    <ChevronRight
                                                                        className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-90" : "")}
                                                                    />
                                                                )}
                                                            </button>

                                                            {/* Submenu */}
                                                            {(!isCollapsed && isOpen) && (
                                                                <ul className="mt-1 px-2 space-y-1">
                                                                    {item.children.filter(child => child.show).map(child => (
                                                                        <li key={child.name}>
                                                                            <Link
                                                                                href={child.href}
                                                                                className={cn(
                                                                                    pathname === child.href
                                                                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                                                                        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                                                                                    'group flex gap-x-3 rounded-md p-2 pl-9 text-sm leading-6 font-medium transition-all'
                                                                                )}
                                                                            >
                                                                                <child.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                                                                                <span className="truncate">{child.name}</span>
                                                                            </Link>

                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </li>
                                                    );
                                                }

                                                return (
                                                    <li key={item.name}>
                                                        <Link
                                                            href={item.href!}
                                                            title={isCollapsed ? item.name : undefined} // Tooltip simples
                                                            className={cn(
                                                                pathname === item.href
                                                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white',
                                                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all',
                                                                isCollapsed ? "justify-center px-3" : ""
                                                            )}
                                                        >
                                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                            {!isCollapsed && <span className="truncate">{item.name}</span>}

                                                            {/* Custom Tooltip on Hover when Collapsed */}
                                                            {isCollapsed && (
                                                                <span className="absolute left-16 z-50 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                                                    {item.name}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    </li>
                                                )
                                            })}
                                        </ul>

                                    </li>
                                    <li className="mt-auto">
                                        <div className="flex w-full items-center justify-center p-2">
                                            <ModeToggle />
                                        </div>
                                    </li>
                                    <li>
                                        <button
                                            onClick={handleLogout}
                                            title={isCollapsed ? "Sair" : undefined}
                                            className={cn(
                                                "group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-900/20 w-full transition-all",
                                                isCollapsed ? "justify-center" : ""
                                            )}
                                        >
                                            <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {!isCollapsed && <span>Sair</span>}

                                            {isCollapsed && (
                                                <span className="absolute left-16 z-50 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                                    Sair
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div
                    className={cn(
                        "flex flex-col flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out",
                        !isOperator && (isCollapsed ? "md:pl-20" : "md:pl-64")
                    )}
                >

                    {/* Mobile Header */}
                    {!isOperator && (
                        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-zinc-900 px-4 py-4 shadow-sm sm:px-6 md:hidden">
                            <button
                                type="button"
                                className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <span className="sr-only">Abrir menu</span>
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            </button>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="relative w-28 h-8">
                                    <Image
                                        src="/logo_Logo_black.svg"
                                        alt="Modal CRM"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
                        {children}
                    </main>
                </div>
            </div>
        </ChatProvider >
    );

}
