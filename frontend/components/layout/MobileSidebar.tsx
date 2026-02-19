'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, LogOut, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
    name: string;
    href?: string;
    icon: LucideIcon;
    show: boolean;
    children?: {
        name: string;
        href: string;
        icon: LucideIcon;
        show: boolean;
    }[];
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
                    "fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ease-linear",
                    open ? "opacity-100" : "opacity-0"
                )}
                onClick={() => setOpen(false)}
            />

            {/* Sidebar Panel */}
            <div className={cn(
                "fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-sidebar p-6 pb-4 shadow-xl transition-transform duration-300 ease-in-out border-r border-border",
                open ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-8">
                    {/* AJUSTE DE TAMANHO DO LOGO MOBILE: Altere w-40 e h-12 */}
                    {/* AJUSTE DE TAMANHO DO LOGO MOBILE: Altere w-40 e h-12 */}
                    <div className="relative w-48 h -14">
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
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setOpen(false)}
                    >
                        <span className="sr-only">Fechar menu</span>
                        <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-1">
                        <li>
                            <ul role="list" className="-mx-2 mt-2 space-y-0.5">
                                {navigation.filter(item => item.show).map((item) => {
                                    if (item.children) {
                                        return (
                                            <li key={item.name}>
                                                <div className="text-[13px] font-medium text-foreground p-2 flex items-center gap-x-3">
                                                    <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                                                    {item.name}
                                                </div>
                                                <ul className="pl-6 mt-0.5 space-y-0.5">
                                                    {item.children.filter(child => child.show).map(child => (
                                                        <li key={child.name}>
                                                            <Link
                                                                href={child.href}
                                                                onClick={() => setOpen(false)}
                                                                className={cn(
                                                                    pathname === child.href
                                                                        ? 'text-primary font-medium bg-primary/10'
                                                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                                                                    'group flex gap-x-3 rounded-md p-1.5 pl-5 text-[12px] leading-5 transition-colors'
                                                                )}
                                                            >
                                                                <div className={cn("w-1 h-1 rounded-full mt-2 mr-1", pathname === child.href ? "bg-primary" : "bg-muted-foreground/30")} />
                                                                {child.name}
                                                            </Link>

                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        );
                                    }

                                    const isActive = pathname === item.href;

                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href!}
                                                onClick={() => setOpen(false)}
                                                className={cn(
                                                    isActive
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                                    'group flex gap-x-3 rounded-md p-2 text-[13px] font-medium transition-colors'
                                                )}
                                            >
                                                <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.5} aria-hidden="true" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}

                            </ul>
                        </li>
                        <li className="mt-auto">
                            <button
                                onClick={onLogout}
                                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
                            >
                                <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                                Sair
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
