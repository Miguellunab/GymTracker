"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function AICoachTrigger({ variant = "nav", className }) {
  const handleOpen = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ai-coach-open"));
    }
  };

  if (variant === "card") {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          "w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800/60",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">AI Coach</p>
            <p className="text-xs text-zinc-500">Hola, soy tu AI Coach</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleOpen}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-zinc-500 transition-colors hover:text-emerald-400",
        className
      )}
    >
      <Bot className="h-6 w-6" />
      <span className="text-[11px] font-semibold text-white">Coach</span>
    </button>
  );
}
