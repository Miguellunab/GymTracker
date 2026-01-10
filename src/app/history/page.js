"use client";

import { History, Flame, Timer, Calendar, Edit2, X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editDuration, setEditDuration] = useState('');
    const [userWeight, setUserWeight] = useState(75);

    useEffect(() => {
        async function fetchData() {
            try {
                const [historyRes, weightRes] = await Promise.all([
                    fetch('/api/workouts'),
                    fetch('/api/weight')
                ]);
                const historyData = await historyRes.json();
                const weightData = await weightRes.json();
                
                setHistory(historyData);
                if (weightData && weightData.length > 0) {
                    setUserWeight(weightData[0].weight);
                }
            } catch (e) {
                console.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const calculateCalories = (durationMinutes, routineName, cardioData) => {
        // Factor de intensidad según tipo de rutina
        let intensityFactor = 0.06; // Base: 0.06 kcal/kg/min
        
        // Pierna tiene mayor consumo calórico
        const routineLower = (routineName || '').toLowerCase();
        if (routineLower.includes('pierna') || routineLower.includes('cuadriceps') || 
            routineLower.includes('femoral') || routineLower.includes('leg')) {
            intensityFactor = 0.08; // 33% más calorías para pierna
        }
        
        const liftCals = intensityFactor * userWeight * durationMinutes;
        
        let cardioCals = 0;
        if (cardioData?.didCardio) {
            let cardioMET = 7.0;
            if (cardioData.cardioIntensity === 'Low') cardioMET = 5.0;
            if (cardioData.cardioIntensity === 'High') cardioMET = 10.0;
            
            const cardioMinutes = Number(cardioData.cardioMinutes) || 0;
            cardioCals = cardioMET * userWeight * (cardioMinutes / 60);
        }
        
        return Math.floor(liftCals + cardioCals);
    };

    const handleEditDuration = (session) => {
        setEditingId(session.id);
        // Dejamos el campo vacío para que el usuario escriba desde cero
        setEditDuration('');
    };

    const handleSaveDuration = async (session) => {
        const newDurationMinutes = Number(editDuration) || 0;
        const newDurationSeconds = newDurationMinutes * 60;
        
        // Recalcular calorías con la nueva duración
        const newCalories = calculateCalories(newDurationMinutes, session.routineName, {
            didCardio: session.didCardio,
            cardioMinutes: session.cardioMinutes,
            cardioIntensity: session.cardioIntensity
        });

        try {
            const res = await fetch(`/api/workouts/${session.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    durationSeconds: newDurationSeconds,
                    totalCalories: newCalories
                })
            });

            if (res.ok) {
                // Actualizar estado local
                setHistory(prev => prev.map(s => 
                    s.id === session.id 
                        ? { ...s, durationSeconds: newDurationSeconds, totalCalories: newCalories }
                        : s
                ));
                setEditingId(null);
            }
        } catch (e) {
            console.error("Failed to update workout");
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditDuration('');
    };

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
                             
                             {editingId === session.id ? (
                                 <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
                                     <Timer className="w-4 h-4 text-emerald-400" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={editDuration}
                                        onChange={(e) => {
                                            const onlyNums = e.target.value.replace(/\D/g, '');
                                            setEditDuration(onlyNums);
                                        }}
                                        className="w-16 bg-black border border-zinc-600 rounded-lg px-2 py-1.5 text-sm text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-zinc-600"
                                        placeholder="60"
                                        autoFocus
                                    />
                                     <span className="text-xs text-zinc-400 font-medium">min</span>
                                     <div className="flex gap-1 ml-1">
                                         <button 
                                             onClick={() => handleSaveDuration(session)}
                                             className="p-1.5 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition"
                                             title="Guardar"
                                         >
                                             <Check className="w-4 h-4" />
                                         </button>
                                         <button 
                                             onClick={handleCancelEdit}
                                             className="p-1.5 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
                                             title="Cancelar"
                                         >
                                             <X className="w-4 h-4" />
                                         </button>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="flex items-center gap-2">
                                     <div className="bg-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-300 font-mono flex items-center gap-1.5">
                                         <Timer className="w-3 h-3 text-zinc-500" />
                                         {session.durationSeconds ? Math.floor(session.durationSeconds / 60) : 60} min
                                     </div>
                                     <button 
                                         onClick={() => handleEditDuration(session)}
                                         className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition"
                                         title="Editar duración"
                                     >
                                         <Edit2 className="w-4 h-4" />
                                     </button>
                                 </div>
                             )}
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
