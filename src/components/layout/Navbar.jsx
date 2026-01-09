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
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-zinc-800 flex justify-around items-center max-w-lg mx-auto">
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-emerald-500 transition-colors"
                    >
                        <item.icon className={cn("w-6 h-6", isActive && "text-emerald-500")} />
                        <span className={cn("text-[10px] font-medium", isActive && "text-white")}>
                            {item.label}
                        </span>
                    </Link>                );
            })}
        </nav>
    );
}
