'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Users, LayoutDashboard, LogOut, PlusCircle, ShieldCheck, Menu, ChevronLeft, ChevronRight, Settings, BarChart, Upload, MessageCircle, Briefcase } from 'lucide-react';

import { cn } from '@/lib/utils';
import api from '@/lib/api';
import MobileSidebar from '@/components/layout/MobileSidebar';
import { ChatProvider } from '@/components/chat/ChatContext';
import ChatButton from '@/components/chat/ChatButton';
import { ModeToggle } from '@/components/mode-toggle';
import WalletModal from '@/components/clients/WalletModal';
import { LeadTransferButton } from '@/components/crm/LeadTransferButton';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [walletOpen, setWalletOpen] = useState(false);

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
        if (pathname?.includes('/users') || pathname?.includes('/settings') || pathname?.includes('/imports')) {
            setSettingsOpen(true);
        }
    }, [pathname]);

    if (!user) return null;

    const navigation = [
        {
            name: 'CRM',
            href: '/kanban',
            icon: LayoutDashboard,
            show: user.role !== 'OPERATOR'
        },
        // Dashboard/Meus Clientes item removed to centralize on CRM

        {
            name: 'Relatórios',
            href: '/reports',
            icon: Users, // Placeholder if BarChart used above, or keep inconsistent for now. Better: Sheet/FileText
            show: user.role === 'ADMIN' || user.role === 'SUPERVISOR'
        },
        {
            name: 'Chat',
            href: '/chat',
            icon: MessageCircle,
            show: user.role === 'SUPERVISOR' || user.role === 'ADMIN'
        },
        {
            name: 'Novo Cliente',
            href: '/new-client',
            icon: PlusCircle,
            show: true
        },
        {
            name: 'Configurações',
            icon: Settings,
            show: user.role === 'ADMIN' || user.role === 'SUPERVISOR',
            children: [

                {
                    name: 'Importar Contas',
                    href: '/imports/open-accounts',
                    icon: Upload,
                    show: user.role === 'ADMIN' || user.role === 'SUPERVISOR'
                },
                {
                    name: 'Gestão de Usuários',
                    href: '/users',
                    icon: Users,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Qualificação',
                    href: '/settings/qualification',
                    icon: Settings,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Cadastro',
                    href: '/settings/registration',
                    icon: Settings,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Tabulações',
                    href: '/settings/tabulations',
                    icon: Settings,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Pipelines (Kanban)',
                    href: '/settings/pipelines',
                    icon: LayoutDashboard,
                    show: user.role === 'ADMIN'
                },
                {
                    name: 'Campos Personalizados',
                    href: '/settings/custom-fields',
                    icon: Settings,
                    show: user.role === 'ADMIN'
                },
            ]
        },
    ];

    // Icon fix: Import Sheet/FileText for reports if needed, but for now reusing existing imports to avoid breaking.
    // Ideally adding 'SquareKanban' to imports would be best.

    const isOperator = user?.role === 'OPERATOR';

    return (
        <ChatProvider>
            <div className="min-h-screen bg-background flex">


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
                            "hidden md:flex flex-col fixed inset-y-0 z-50 bg-sidebar backdrop-blur-sm border-r border-border transition-all duration-300 ease-in-out",
                            isCollapsed ? "w-16" : "w-60"
                        )}
                    >
                        {/* Header with Toggle */}
                        <div className={cn("flex items-center h-14 shrink-0 transition-all duration-300", isCollapsed ? "justify-center" : "px-4 justify-between")}>
                            {/* Logo Area */}
                            <div className={cn("relative flex items-center transition-all duration-300", isCollapsed ? "w-9 h-9" : "w-70 h-25")}>
                                {isCollapsed ? (
                                    <>
                                        <Image
                                            src="/logo_icone.svg"
                                            alt="Modal CRM"
                                            fill
                                            className="object-contain dark:hidden"
                                        />
                                        <Image
                                            src="/logo_icone_white.svg"
                                            alt="Modal CRM"
                                            fill
                                            className="object-contain hidden dark:block"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Image
                                            src="/logo_Logo_black.svg"
                                            alt="Modal CRM"
                                            fill
                                            className="object-contain object-left dark:hidden"
                                            priority
                                        />
                                        <Image
                                            src="/logo_logo_white.svg"
                                            alt="Modal CRM"
                                            fill
                                            className="object-contain object-left hidden dark:block"
                                            priority
                                        />
                                    </>
                                )}
                            </div>

                            {/* Internal Toggle Button */}
                            {!isCollapsed && (
                                <button
                                    onClick={toggleSidebar}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    title="Recolher menu"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Expand Button when collapsed (Top centered) */}
                        {isCollapsed && (
                            <div className="flex justify-center py-2">
                                <button
                                    onClick={toggleSidebar}
                                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                                    title="Expandir menu"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className={cn("flex flex-col gap-y-4 overflow-y-auto pt-4 grow transition-all", isCollapsed ? "px-2" : "px-3")}>
                            <nav className="flex flex-1 flex-col">
                                <ul role="list" className="flex flex-1 flex-col gap-y-1">
                                    <li>
                                        <ul role="list" className="space-y-0.5">
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
                                                                    isActive
                                                                        ? 'bg-accent text-accent-foreground'
                                                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                                                    'group flex w-full items-center justify-between rounded-md p-2 text-[13px] font-medium transition-all duration-150',
                                                                    isCollapsed ? "justify-center px-2" : ""
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-x-3">
                                                                    <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.5} aria-hidden="true" />
                                                                    {!isCollapsed && <span>{item.name}</span>}
                                                                </div>
                                                                {!isCollapsed && (
                                                                    <ChevronRight
                                                                        className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen ? "rotate-90" : "")}
                                                                    />
                                                                )}
                                                            </button>

                                                            {/* Submenu */}
                                                            {(!isCollapsed && isOpen) && (
                                                                <ul className="mt-0.5 px-2 space-y-0.5">
                                                                    {item.children.filter(child => child.show).map(child => (
                                                                        <li key={child.name}>
                                                                            <Link
                                                                                href={child.href}
                                                                                className={cn(
                                                                                    pathname === child.href
                                                                                        ? 'text-primary bg-primary/10 font-medium'
                                                                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                                                                                    'group flex gap-x-3 rounded-md p-1.5 pl-9 text-[12px] leading-5 transition-all duration-150'
                                                                                )}
                                                                            >
                                                                                <div className="w-5 flex justify-center shrink-0">
                                                                                    <div className={cn("w-1 h-1 rounded-full", pathname === child.href ? "bg-primary" : "bg-muted-foreground/30")} />
                                                                                </div>
                                                                                <span className="truncate">{child.name}</span>
                                                                            </Link>

                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </li>
                                                    );
                                                }

                                                const isActive = pathname === item.href;

                                                return (
                                                    <li key={item.name}>
                                                        <Link
                                                            href={item.href!}
                                                            title={isCollapsed ? item.name : undefined}
                                                            className={cn(
                                                                isActive
                                                                    ? 'bg-accent text-accent-foreground'
                                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                                                'group flex gap-x-3 rounded-md p-2 text-[13px] font-medium transition-all duration-150',
                                                                isCollapsed ? "justify-center px-2" : ""
                                                            )}
                                                        >
                                                            <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.5} aria-hidden="true" />
                                                            {!isCollapsed && <span className="truncate">{item.name}</span>}

                                                            {/* Custom Tooltip on Hover when Collapsed */}
                                                            {isCollapsed && (
                                                                <span className="absolute left-14 z-50 rounded bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap ml-2 border border-border">
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
                                        <div className="flex w-full items-center justify-center py-2">
                                            <ModeToggle />
                                        </div>
                                    </li>
                                    <li>
                                        <button
                                            onClick={handleLogout}
                                            title={isCollapsed ? "Sair" : undefined}
                                            className={cn(
                                                "group flex gap-x-3 rounded-md p-2 text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-all duration-150",
                                                isCollapsed ? "justify-center" : ""
                                            )}
                                        >
                                            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                                            {!isCollapsed && <span>Sair</span>}

                                            {isCollapsed && (
                                                <span className="absolute left-14 z-50 rounded bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap ml-2 border border-border">
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
                        !isOperator && (isCollapsed ? "md:pl-16" : "md:pl-60")
                    )}
                >

                    {/* Mobile Header */}
                    {!isOperator && (
                        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-card px-4 py-4 shadow-sm sm:px-6 md:hidden border-b border-border">
                            <button
                                type="button"
                                className="-m-2.5 p-2.5 text-foreground lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <span className="sr-only">Abrir menu</span>
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            </button>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="relative w-40 h-11">
                                    <Image
                                        src="/logo_Logo_black.svg"
                                        alt="Modal CRM"
                                        fill
                                        className="object-contain dark:hidden"
                                        priority
                                    />
                                    <Image
                                        src="/logo_logo_white.svg"
                                        alt="Modal CRM"
                                        fill
                                        className="object-contain hidden dark:block"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Operator Header (Always Visible) - PORTED FROM ORIGINAL PROJECT */}
                    {isOperator && (
                        <div className="sticky top-0 z-40 flex items-center justify-between bg-white dark:bg-zinc-900 px-6 py-3 border-b border-gray-100 dark:border-zinc-800 shadow-sm">
                            <div className="relative w-32 h-10">
                                {/* Using Logo Logic from Mobile Sidebar/Original Layout for Consistency */}
                                <Image
                                    src="/logo_Logo_black.svg"
                                    alt="Modal CRM"
                                    fill
                                    className="object-contain object-left dark:hidden"
                                    priority
                                />
                                <Image
                                    src="/logo_logo_white.svg"
                                    alt="Modal CRM"
                                    fill
                                    className="object-contain object-left hidden dark:block"
                                    priority
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mr-2 bg-gray-50 dark:bg-zinc-800 px-3 py-1 rounded-full">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium">Painel do Operador</span>
                                </div>
                                <ModeToggle />
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                    title="Sair"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 relative">
                        {children}

                        {/* Floating Action Buttons for Operator */}
                        {isOperator && (
                            <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
                                {/* Minha Carteira Button */}
                                <button
                                    onClick={() => setWalletOpen(true)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center w-14 h-14"
                                    title="Minha Carteira"
                                >
                                    <Briefcase size={24} />
                                </button>

                                {/* Chat Button */}
                                <div className="relative">
                                    <ChatButton
                                        currentUser={user}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center w-14 h-14"
                                    />
                                </div>

                                <LeadTransferButton userRole={user.role} />
                            </div>
                        )}
                    </main>

                    {/* Wallet Modal for Operator */}
                    <WalletModal
                        isOpen={walletOpen}
                        onClose={() => setWalletOpen(false)}
                        currentUser={user}
                    />
                </div>
            </div>
        </ChatProvider >
    );
}
