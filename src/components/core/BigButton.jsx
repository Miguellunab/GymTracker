import { cn } from "@/lib/utils";

export function BigButton({ children, onClick, variant = "neutral", className }) {
    const variants = {
        neutral: "bg-zinc-800 text-zinc-200 active:bg-zinc-700 border-zinc-700",
        primary: "bg-emerald-900/40 text-emerald-400 active:bg-emerald-900/60 border-emerald-800",
        danger: "bg-rose-900/40 text-rose-400 active:bg-rose-900/60 border-rose-800",
        active: "bg-zinc-100 text-black active:bg-zinc-300 border-zinc-200"
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center justify-center w-full min-h-[72px] text-xl font-bold rounded-2xl border transition-all duration-100 transform active:scale-[0.98]",
                variants[variant],
                className
            )}
        >
            {children}
        </button>
    );
}
