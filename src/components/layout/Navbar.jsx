"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, ScrollText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/routines", label: "Rutinas", icon: Dumbbell },
    { href: "/history", label: "Historial", icon: ScrollText },
    { href: "/profile", label: "Perfil", icon: User },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto flex h-[4.5rem] max-w-3xl items-center justify-around gap-2 rounded-t-2xl border border-zinc-800/80 bg-zinc-950/90 px-4 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-emerald-400 transition-colors"
                    >
                        <item.icon className={cn("w-6 h-6", isActive && "text-emerald-400")} />
                        <span className={cn("text-[11px] font-semibold", isActive && "text-white")}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
