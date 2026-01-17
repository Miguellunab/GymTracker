"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailyCoachTip({ className, date }) {
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  // Use the passed date or default to today
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);

  useEffect(() => {
    // Reset state when date changes
    setTip(null);
    setLoading(true);
    setVisible(true);

    // Check cache for this specific date
    const cachedTip = localStorage.getItem(`coach_tip_${dateStr}`);
    
    if (cachedTip) {
      try {
        setTip(JSON.parse(cachedTip));
        setLoading(false);
      } catch(e) {
        fetchTip();
      }
    } else {
      fetchTip();
    }
  }, [dateStr]); // Re-run when dateStr changes

  const fetchTip = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coach/daily?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch tip");
      const data = await res.json();
      
      setTip(data);
      
      // Cache for this specific date
      localStorage.setItem(`coach_tip_${dateStr}`, JSON.stringify(data));
      
    } catch (e) {
      console.error(e);
      // Fallback tip
      setTip({ message: "¡Hoy es un buen día para entrenar! Escucha a tu cuerpo." });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm transition-all animate-in slide-in-from-bottom-4 fade-in duration-700",
      className
    )}>
       {/* Background glow effect */}
       <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

       <div className="flex gap-4 items-start">
          <div className="flex-shrink-0">
             <div className="h-12 w-12 rounded-2xl bg-emerald-950/50 flex items-center justify-center border border-emerald-900/30">
                <Bot className={cn("h-6 w-6 text-emerald-400", loading && "animate-pulse")} />
             </div>
          </div>
          
          <div className="flex-1 space-y-1">
             <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Consejo Diario</h3>
                <button onClick={handleClose} className="text-zinc-600 hover:text-zinc-400 p-1">
                    <X className="w-4 h-4" />
                </button>
             </div>
             
             {loading ? (
                <div className="space-y-2 mt-2">
                    <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2 animate-pulse" />
                </div>
             ) : (
                <div className="prose prose-invert prose-sm">
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        {tip?.message || "Analizando tu historial..."}
                    </p>
                    {tip?.action && (
                        <div className="mt-3 inline-block rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                             <span className="text-xs font-bold text-emerald-400">{tip.action}</span>
                        </div>
                    )}
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
