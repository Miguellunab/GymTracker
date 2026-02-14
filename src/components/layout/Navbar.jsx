"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScrollText, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/history", label: "Historial", icon: ScrollText },
  { href: "/profile", label: "Perfil", icon: User },
];

export function Navbar() {
  const pathname = usePathname();

  // Hide navbar on workout log page (fullscreen)
  if (pathname.startsWith("/workout")) return null;

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 py-2 px-4"
          >
            <item.icon
              className={`w-5 h-5 transition-colors duration-200 ${
                isActive ? "text-[#00C853]" : "text-zinc-500"
              }`}
            />
            <span
              className={`text-[10px] font-semibold transition-colors duration-200 ${
                isActive ? "text-white" : "text-zinc-500"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
