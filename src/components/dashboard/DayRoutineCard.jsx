"use client";

import { Dumbbell, Check, X, Trophy } from "lucide-react";
import Link from 'next/link';
import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function DayRoutineCard() {
    const [showLegModal, setShowLegModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [todayStatus, setTodayStatus] = useState(null);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/calendar');
            const data = await res.json();
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            if (data[todayStr]) {
                setTodayStatus(data[todayStr].title);
            } else {
                setTodayStatus(null);
            }
        } catch (e) {
            console.error("Status check failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const setRestDay = async () => {
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            await fetch('/api/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: todayStr, type: 'Descanso' })
            });
            checkStatus(); // Refresh
            // Force reload to update Calendar component sibling? 
            // Ideally use Context, but simpler to reload or just hope the user navigates.
            // Since Calendar is on same page, it won't auto-update unless parent triggers.
            // I'll emit a simple event or just let it be. But user requested visual sync.
            // For now, reload page is safest quick fix.
            window.location.reload(); 
        } catch (e) {
            alert("Error");
        }
    };

    if (loading) return <div className="mx-4 h-40 bg-zinc-900 rounded-2xl animate-pulse" />;

    if (todayStatus && todayStatus !== 'Descanso') {
        return (
            <div className="mx-4 bg-emerald-900/20 border border-emerald-900 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Trophy className="w-8 h-8 text-black fill-current" />
                </div>
                <h3 className="text-white text-xl font-bold mb-1">¡Entrenamiento Completado!</h3>
                <p className="text-emerald-400 font-mono text-sm mb-4 uppercase">{todayStatus}</p>
                <div className="text-zinc-500 text-xs">
                    Buen trabajo. ¡Nos vemos mañana!
                </div>
            </div>
        );
    }

    if (todayStatus === 'Descanso') {
         return (
            <div className="mx-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-white text-xl font-bold mb-1">Día de Descanso</h3>
                <p className="text-zinc-500 text-sm">El músculo crece cuando descansas.</p>
            </div>
        );
    }

    return (
        <div className="mx-4">
            <h3 className="text-white text-lg font-bold mb-3 px-2">¿Qué toca hoy?</h3>
            
            <div className="grid grid-cols-2 gap-3">
                <Link href="/workout/start?routine=Pecho / Espalda" className="contents">
                    <button className="h-24 rounded-2xl bg-blue-900/40 border border-blue-800 hover:bg-blue-800/50 flex flex-col items-center justify-center gap-2 transition-all">
                        <Dumbbell className="text-blue-400 w-8 h-8" />
                        <span className="text-blue-100 font-bold text-sm">Pecho / Espalda</span>
                    </button>
                </Link>

                <button onClick={() => setShowLegModal(true)} className="h-24 rounded-2xl bg-red-900/40 border border-red-800 hover:bg-red-800/50 flex flex-col items-center justify-center gap-2 transition-all">
                    <Dumbbell className="text-red-400 w-8 h-8" />
                    <span className="text-red-100 font-bold text-sm">Pierna</span>
                </button>

                <Link href="/workout/start?routine=Brazos" className="contents">
                    <button className="h-24 rounded-2xl bg-purple-900/40 border border-purple-800 hover:bg-purple-800/50 flex flex-col items-center justify-center gap-2 transition-all">
                        <Dumbbell className="text-purple-400 w-8 h-8" />
                        <span className="text-purple-100 font-bold text-sm">Brazos</span>
                    </button>
                </Link>

                <button 
                    onClick={setRestDay}
                    className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-all hover:bg-zinc-800"
                >
                    <X className="text-zinc-500 w-8 h-8" />
                    <span className="text-zinc-400 font-bold text-sm">Descanso</span>
                </button>
            </div>
            
             {/* Leg Selection Modal */}
            {showLegModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setShowLegModal(false)}
                >
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-white text-xl font-bold text-center">¿Qué toca hoy?</h3>
                        
                        <div className="grid gap-3">
                            <Link href="/workout/start?routine=Pierna Cuádriceps" className="block">
                                <button className="w-full p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-100 font-bold hover:bg-red-900/50 transition-all flex items-center justify-between">
                                    <span>Cuádriceps</span>
                                    <div className="bg-red-500/20 p-2 rounded-full"><Dumbbell className="w-4 h-4 text-red-400"/></div>
                                </button>
                            </Link>

                            <Link href="/workout/start?routine=Pierna Femoral" className="block">
                                <button className="w-full p-4 rounded-xl bg-orange-900/30 border border-orange-800 text-orange-100 font-bold hover:bg-orange-900/50 transition-all flex items-center justify-between">
                                    <span>Femoral (Isquios)</span>
                                    <div className="bg-orange-500/20 p-2 rounded-full"><Dumbbell className="w-4 h-4 text-orange-400"/></div>
                                </button>
                            </Link>
                        </div>
                        
                        <button onClick={() => setShowLegModal(false)} className="w-full py-3 text-zinc-500 text-sm font-medium">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}