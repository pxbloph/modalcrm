'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, LogOut, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
    show: boolean;
}

interface MobileSidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    navigation: NavigationItem[];
    onLogout: () => void;
}

export default function MobileSidebar({ open, setOpen, navigation, onLogout }: MobileSidebarProps) {
    const pathname = usePathname();

    return (
        <div className={cn(
            "relative z-50 md:hidden",
            !open && "pointer-events-none"
        )}>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear",
                    open ? "opacity-100" : "opacity-0"
                )}
                onClick={() => setOpen(false)}
            />

            {/* Sidebar Panel */}
            <div className={cn(
                "fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white p-6 pb-4 shadow-xl transition-transform duration-300 ease-in-out",
                open ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-8">
                    {/* AJUSTE DE TAMANHO DO LOGO MOBILE: Altere w-40 e h-12 */}
                    <div className="relative w-40 h-12">
                        <Image
                            src="/logo_Logo_black.svg"
                            alt="Modal CRM"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-500"
                        onClick={() => setOpen(false)}
                    >
                        <span className="sr-only">Fechar menu</span>
                        <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <div className="text-xs font-semibold leading-6 text-gray-400">Menu</div>
                            <ul role="list" className="-mx-2 mt-2 space-y-1">
                                {navigation.filter(item => item.show).map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                pathname === item.href
                                                    ? 'bg-indigo-50 text-indigo-600'
                                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                            )}
                                        >
                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                        <li className="mt-auto">
                            <button
                                onClick={onLogout}
                                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-red-50 hover:text-red-600 w-full"
                            >
                                <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                                Sair
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
