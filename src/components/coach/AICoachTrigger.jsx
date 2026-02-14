"use client";

import { Bot } from "lucide-react";

export function AICoachTrigger({ className }) {
  const handleOpen = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ai-coach-open"));
    }
  };

  return (
    <button
      onClick={handleOpen}
      className={`glass-card-hover p-4 flex items-center gap-3 w-full ${className || ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green-dim">
        <Bot className="h-5 w-5 text-[#00C853]" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold">AI Coach</p>
        <p className="text-xs text-zinc-500">Preguntame lo que quieras</p>
      </div>
    </button>
  );
}
