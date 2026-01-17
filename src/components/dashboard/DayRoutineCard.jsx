"use client";

import { Dumbbell, Check, X, Trophy } from "lucide-react";
import Link from 'next/link';
import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function DayRoutineCard({ selectedDate, onAdvanceDate }) {
    const [showLegModal, setShowLegModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [todayStatus, setTodayStatus] = useState(null);

    // If selectedDate is not provided, default to today
    // But we should respect the selectedDate passed from DashboardCalendar
    const targetDate = selectedDate || new Date();
    const isFuture = targetDate > new Date();
    const isTodayOrPast = !isFuture;
    const isSelectedDateToday = format(targetDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    const checkStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/calendar');
            const data = await res.json();
            const dateStr = format(targetDate, 'yyyy-MM-dd');
            if (data[dateStr]) {
                setTodayStatus(data[dateStr].title);
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
    }, [targetDate]); // Refetch when date changes

    const setRestDay = async () => {
        try {
            const dateStr = format(targetDate, 'yyyy-MM-dd');
            await fetch('/api/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, type: 'Descanso' })
            });
            checkStatus(); // Refresh local status
            
            // Advance to next day if callback provided
            if (onAdvanceDate) {
                // Small delay to let user see "Descanso" feedback briefly? 
                // Or immediate? Let's do immediate for responsiveness, or short timeout.
                setTimeout(() => {
                    onAdvanceDate();
                }, 500);
            } else {
                 window.location.reload(); 
            }
        } catch (e) {
            alert("Error");
        }
    };

    if (loading) return <div className="mx-4 h-40 bg-zinc-900 rounded-2xl animate-pulse" />;

    // Case 1: Past or Today, and has status
    if (todayStatus && todayStatus !== 'Descanso') {
        return (
            <div className="mx-4 bg-emerald-900/20 border border-emerald-900 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Trophy className="w-8 h-8 text-black fill-current" />
                </div>
                <h3 className="text-white text-xl font-bold mb-1">Entrenamiento Registrado</h3>
                <p className="text-emerald-400 font-mono text-sm mb-4 uppercase">{todayStatus}</p>
                <div className="text-zinc-500 text-xs">
                    {format(targetDate, 'yyyy-MM-dd')}
                </div>
            </div>
        );
    }

    // Case 2: Past or Today, and is Rest Day
    if (todayStatus === 'Descanso') {
         return (
            <div className="mx-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-white text-xl font-bold mb-1">Día de Descanso</h3>
                <p className="text-zinc-500 text-sm">Registro del {format(targetDate, 'dd/MM')}</p>
            </div>
        );
    }

    // Case 3: Future Date (Read Only / Preview) - Or if user wants to plan ahead?
    // User said: "no modificar" future days. But "cuando yo selecciono un dia... quiero que me salga el consejo".
    // For now, if future, we just show "Próximamente" or maybe nothing?
    // User said: "los dias anteriores tengan la opcion de poner que entrenamiento hice ya que debo poder editar"
    // So editable is TRUE for Past/Today. FALSE for Future.
    
    if (isFuture) {
        return (
            <div className="mx-4 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl p-8 text-center">
                <p className="text-zinc-500 font-medium">No puedes editar días futuros</p>
            </div>
        )
    }

    // Case 4: No status yet (Editable for Today/Past)
    return (
        <div className="mx-4">
            <h3 className="text-white text-lg font-bold mb-3 px-2">
                {isSelectedDateToday ? "¿Qué toca hoy?" : `Registrar entreno del ${format(targetDate, 'dd/MM')}`}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
                <Link href={`/workout/start?routine=Pecho / Espalda&date=${format(targetDate, 'yyyy-MM-dd')}`} className="contents">
                    <button className="h-24 rounded-2xl bg-blue-900/40 border border-blue-800 hover:bg-blue-800/50 flex flex-col items-center justify-center gap-2 transition-all">
                        <Dumbbell className="text-blue-400 w-8 h-8" />
                        <span className="text-blue-100 font-bold text-sm">Pecho / Espalda</span>
                    </button>
                </Link>

                <button onClick={() => setShowLegModal(true)} className="h-24 rounded-2xl bg-red-900/40 border border-red-800 hover:bg-red-800/50 flex flex-col items-center justify-center gap-2 transition-all">
                    <Dumbbell className="text-red-400 w-8 h-8" />
                    <span className="text-red-100 font-bold text-sm">Pierna</span>
                </button>

                <Link href={`/workout/start?routine=Brazos&date=${format(targetDate, 'yyyy-MM-dd')}`} className="contents">
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
                            <Link href={`/workout/start?routine=Pierna Cuádriceps&date=${format(targetDate, 'yyyy-MM-dd')}`} className="block">
                                <button className="w-full p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-100 font-bold hover:bg-red-900/50 transition-all flex items-center justify-between">
                                    <span>Cuádriceps</span>
                                    <div className="bg-red-500/20 p-2 rounded-full"><Dumbbell className="w-4 h-4 text-red-400"/></div>
                                </button>
                            </Link>

                            <Link href={`/workout/start?routine=Pierna Femoral&date=${format(targetDate, 'yyyy-MM-dd')}`} className="block">
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