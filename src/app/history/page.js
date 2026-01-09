"use client";

import { History, Flame, Timer, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

export default function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const res = await fetch('/api/workouts');
                const data = await res.json();
                setHistory(data);
            } catch (e) {
                console.error("Failed to load history");
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, []);

    // Filter out "Descanso" or empty routine names that act as placeholders
    const visibleHistory = history.filter(s => s.routineName && s.routineName !== 'Descanso');

    if (loading) return <div className="p-10 text-zinc-500">Cargando...</div>;

    return (
        <div className="min-h-screen bg-black pb-24 p-4">
             <header className="mb-6 mt-4">
                <h1 className="text-2xl font-bold text-white">Historial</h1>
                <p className="text-zinc-500 text-sm">Tus últimos entrenamientos</p>
             </header>

             <div className="space-y-4">
                 {visibleHistory.map((session) => (
                     <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h3 className="text-white font-bold text-lg">{session.routineName}</h3>
                                 <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1">
                                     <Calendar className="w-3 h-3" />
                                     {new Date(session.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                 </div>
                             </div>
                             <div className="bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 font-mono">
                                 {/* Mock duration if not tracked, or calculate from created/updated */}
                                 {session.durationSeconds ? Math.floor(session.durationSeconds / 60) : 60} min
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-2 mt-2">
                             <div className="bg-black/40 p-2 rounded-lg flex items-center gap-2">
                                 <Flame className="w-4 h-4 text-orange-500" />
                                 <span className="text-zinc-300 text-sm font-bold">{session.totalCalories || 0} kcal</span>
                             </div>
                             <div className="bg-black/40 p-2 rounded-lg flex items-center gap-2">
                                 <Timer className="w-4 h-4 text-blue-500" />
                                 <span className="text-zinc-300 text-sm font-bold">
                                     {session.didCardio ? `+${session.cardioMinutes || 0}m Cardio` : "Sin Cardio"}
                                 </span>
                             </div>
                         </div>
                     </div>
                 ))}
                 
                 {visibleHistory.length === 0 && (
                     <div className="text-center text-zinc-600 mt-10">
                         No hay registros aún.
                     </div>
                 )}
             </div>
        </div>
    );
}
