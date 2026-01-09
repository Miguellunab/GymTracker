"use client";

import { useState, useEffect } from "react";
import { BigButton } from "@/components/core/BigButton";
import { User, Scale, Ruler, Flame, Plus, Trash2 } from "lucide-react";

export default function ProfilePage() {
    // Fixed Profile
    const USER_NAME = "Miguel Lopez";
    const USER_HEIGHT = 170; // cm

    const [weightLog, setWeightLog] = useState([]);
    const [showAddWeight, setShowAddWeight] = useState(false);
    const [newWeight, setNewWeight] = useState("");

    useEffect(() => {
        fetch('/api/weight')
            .then(res => {
                if(!res.ok) throw new Error("Failed to fetch weight logs");
                return res.json();
            })
            .then(data => {
                if(Array.isArray(data)) setWeightLog(data);
            })
            .catch(e => console.error(e));
    }, []);

    const currentWeight = weightLog[0]?.weight || 0;
    const lastDate = weightLog[0]?.date ? new Date(weightLog[0].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : "Sin registro";

    const handleAddWeight = async () => {
        if(!newWeight) return;
        try {
            await fetch('/api/weight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: newWeight })
            });
            const res = await fetch('/api/weight');
            setWeightLog(await res.json());
            setShowAddWeight(false);
            setNewWeight("");
        } catch(e) {
            alert("Error");
        }
    };

    const handleDeleteWeight = async (id) => {
        if(!confirm("¿Eliminar este registro?")) return;
        try {
            await fetch(`/api/weight?id=${id}`, { method: 'DELETE' });
            // Optimistic update
            setWeightLog(prev => prev.filter(l => l.id !== id));
        } catch(e) {
            alert("Error al eliminar");
        }
    };
    
    return (
        <div className="min-h-screen bg-black pb-24 p-4 flex flex-col items-center">
            
            {/* Header Profile */}
            <div className="mt-8 mb-6 relative">
                 <div className="h-24 w-24 rounded-full bg-zinc-800 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden">
                     <img src="/profile.jpg" alt="Profile" className="w-full h-full object-cover" />
                 </div>
                 <div className="absolute bottom-0 right-0 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">
                     PRO
                 </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{USER_NAME}</h1>
            <div className="flex flex-col items-center gap-1 text-sm text-zinc-500 mb-8">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Ruler className="w-4 h-4" /> {USER_HEIGHT} cm</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                    <span className="flex items-center gap-1"><Scale className="w-4 h-4" /> {currentWeight} kg</span>
                </div>
                {weightLog.length > 0 && <span className="text-xs text-zinc-600">Último pesaje: {lastDate}</span>}
            </div>

            <div className="w-full max-w-md space-y-8">
                
                {/* Weight Section */}
                <section>
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Scale className="w-4 h-4" /> Historial de Peso
                        </h2>
                        <button 
                            onClick={() => setShowAddWeight(!showAddWeight)}
                            className="text-emerald-500 text-xs font-bold flex items-center gap-1 hover:underline"
                        >
                            <Plus className="w-3 h-3" /> Registrar
                        </button>
                    </div>

                    {showAddWeight && (
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 mb-4 animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={newWeight}
                                    onChange={e => setNewWeight(e.target.value)}
                                    placeholder="80.0"
                                    className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white font-bold outline-none focus:border-emerald-500"
                                    autoFocus
                                />
                                <button 
                                    onClick={handleAddWeight}
                                    className="bg-emerald-500 text-black font-bold px-4 rounded-lg text-sm"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                        {weightLog.map((log) => (
                            <div key={log.id} className="p-4 flex items-center justify-between group">
                                <span className="text-zinc-500 text-sm">{new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-white font-bold font-mono">{log.weight} kg</span>
                                    <button 
                                        onClick={() => handleDeleteWeight(log.id)}
                                        className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {weightLog.length === 0 && (
                            <div className="p-4 text-center text-zinc-600 text-sm">No hay registros aún.</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
