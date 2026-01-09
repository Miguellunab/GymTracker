"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BigButton } from '@/components/core/BigButton';
import TimerWidget from '@/components/timer/TimerWidget';
import { ChevronDown, ChevronUp, CheckCircle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimerEngine } from '@/hooks/useTimerEngine';

function WorkoutRunner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const routineName = searchParams.get('routine') || "Free Workout";
    
    // State
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedExercise, setExpandedExercise] = useState(null);
    const [workoutData, setWorkoutData] = useState({}); 
    const [showFinishModal, setShowFinishModal] = useState(false);
    
    // Timer & Metrics
    const timerEngine = useTimerEngine();
    const [startTime] = useState(Date.now());
    const [userWeight, setUserWeight] = useState(75); // Default fallback

    // Load Routine & User Weight
    useEffect(() => {
        async function load() {
            try {
                // Fetch Routine
                const res = await fetch(`/api/routines?name=${encodeURIComponent(routineName)}`);
                const data = await res.json();
                if (data && data.exercises) {
                    setExercises(data.exercises);
                    setExpandedExercise(data.exercises[0]?.id);
                }

                // Fetch User Weight
                const weightRes = await fetch('/api/weight');
                const weightData = await weightRes.json();
                if (weightData && weightData.length > 0) {
                    setUserWeight(weightData[0].weight);
                }

            } catch (e) {
                console.error("Failed to load data", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [routineName]);

    const handleSaveSet = (exerciseId, weight, reps, isWarmup = false, weight2 = null, reps2 = null) => {
        // Just save locally in state
        const newSet = { weight, reps, isWarmup, weight2, reps2, timestamp: Date.now() };
        
        setWorkoutData(prev => ({
            ...prev,
            [exerciseId]: [...(prev[exerciseId] || []), newSet]
        }));
    };

    const submitWorkout = async (extraData) => {
        try {
            await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routineName,
                    workoutData,
                    ...extraData,
                    date: searchParams.get('date'),
                    durationSeconds: Math.floor((Date.now() - startTime) / 1000)
                })
            });
            router.push('/');
        } catch (e) {
            alert("Error saving workout");
        }
    };

    if (loading) return <div className="min-h-screen bg-black text-white p-10">Cargando rutina...</div>;

    return (
        <div className="min-h-screen bg-black pb-32 p-4">
             {/* Sticky Header with Timer */}
             <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 border-b border-zinc-800/50 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold font-mono uppercase text-emerald-500">{routineName}</h1>
                    <button 
                        onClick={() => setShowFinishModal(true)}
                        className="text-xs bg-red-900/30 text-red-500 px-3 py-1 rounded-full font-bold border border-red-900/50"
                    >
                        FINALIZAR
                    </button>
                </div>
                <TimerWidget engine={timerEngine} />
             </div>

             {/* Exercise List */}
             <div className="mt-6 flex flex-col gap-4">
                {exercises.map((ex, idx) => {
                    const isLast = idx === exercises.length - 1;
                    return (
                        <ExerciseCard 
                            key={ex.id} 
                            exercise={ex} 
                            isExpanded={expandedExercise === ex.id}
                            onToggle={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
                            sets={workoutData[ex.id] || []}
                            onSaveSet={(w, r, wrm, w2, r2) => handleSaveSet(ex.id, w, r, wrm, w2, r2)}
                            isLast={isLast}
                            onNext={() => {
                                if (isLast) {
                                    setShowFinishModal(true);
                                } else {
                                    setExpandedExercise(exercises[idx + 1].id);
                                }
                            }}
                        />
                    );
                })}
             </div>

             {/* Modal */}
             {showFinishModal && (
                 <PostWorkoutModal 
                    routineName={routineName}
                    durationSeconds={(Date.now() - startTime) / 1000}
                    userWeight={userWeight}
                    onClose={() => setShowFinishModal(false)} 
                    onSave={submitWorkout}
                />
             )}
        </div>
    );
}

function ExerciseCard({ exercise, isExpanded, onToggle, sets, onSaveSet, onNext, isLast }) {
    const [numSets, setNumSets] = useState('');
    
    // Primary (or only) exercise
    const [weight, setWeight] = useState(''); 
    const [reps, setReps] = useState('');     

    // Secondary (for Biseries)
    const [weight2, setWeight2] = useState('');
    const [reps2, setReps2] = useState('');
    
    // Warmup states
    const [warmupWeight, setWarmupWeight] = useState('');
    const [warmupReps, setWarmupReps] = useState('');
    const [warmupDone, setWarmupDone] = useState(false);

    // Detect Biserie
    const isBiserie = exercise.name.toLowerCase().startsWith("biserie");
    const [exName1, exName2] = isBiserie 
        ? exercise.name.replace(/biserie:/i, "").split("+").map(s => s.trim()) 
        : [exercise.name, ""];

    const handleComplete = () => {
        if (!numSets) return;
        
        // Save Warmup if filled
        if(warmupWeight && warmupReps && !warmupDone) {
             onSaveSet(warmupWeight, warmupReps, true);
             setWarmupDone(true);
        }

        for(let i=0; i<numSets; i++) {
             onSaveSet(
                weight || exercise.lastWeight || 0, 
                reps || exercise.lastReps || 0, 
                false,
                isBiserie ? (weight2 || 0) : null,
                isBiserie ? (reps2 || 0) : null
             );
        }
        onNext();
    }

    return (
        <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 transition-all">
            <button 
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between bg-zinc-800/50"
            >
                <div className="text-left">
                   <h3 className="text-lg font-bold text-white text-left break-words w-[250px] leading-tight">
                       {isBiserie ? (
                           <>
                               <span className="text-emerald-400 block text-xs uppercase mb-1">Biserie (Superset)</span>
                               <span className="block mb-1">• {exName1}</span>
                               <span className="block">• {exName2}</span>
                           </>
                       ) : exercise.name}
                   </h3>
                   <div className="flex gap-2 text-xs text-zinc-400 mt-2">
                       <span className="text-emerald-500 font-mono">
                           Sets: {sets.length}
                       </span>
                       <span className="opacity-50">|</span>
                       <span>{sets.length > 0 ? "Completado" : "Pendiente"}</span>
                   </div>
                </div>
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </button>

            {isExpanded && (
                <div className="p-4 bg-zinc-900">
                     <div className="flex justify-between items-start mb-4">
                        <p className="text-zinc-500 text-sm italic">{exercise.notes}</p>
                        {exercise.lastWeight && (
                            <div className="text-right">
                                <span className="text-[10px] text-zinc-500 uppercase block">Anterior</span>
                                <span className="text-xs text-emerald-500 font-mono">
                                    {exercise.lastWeight}kg × {exercise.lastReps}
                                </span>
                            </div>
                        )}
                     </div>
                    
                    {/* Warmup Section */}
                    <div className="mb-6 p-4 bg-yellow-900/10 border border-yellow-800/30 rounded-xl">
                        <label className="text-xs text-yellow-500 font-bold uppercase mb-2 block flex items-center gap-2">
                             <Flame className="w-3 h-3" /> Calentamiento Global
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <input 
                                    type="number" 
                                    value={warmupWeight}
                                    onChange={e => setWarmupWeight(e.target.value)}
                                    className="w-full bg-black border border-zinc-700 rounded-xl p-2 text-sm text-center text-white focus:border-yellow-500 outline-none placeholder-zinc-700" 
                                    placeholder="Peso"
                                />
                            </div>
                              <div>
                                <input 
                                    type="number" 
                                    value={warmupReps}
                                    onChange={e => setWarmupReps(e.target.value)}
                                    placeholder="Reps"
                                    className="w-full bg-black border border-zinc-700 rounded-xl p-2 text-sm text-center text-white focus:border-yellow-500 outline-none placeholder-zinc-700" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 space-y-4">
                        {/* Num Sets */}
                        <div>
                             <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Total Series</label>
                             <input 
                                type="number" 
                                value={numSets}
                                onChange={e => setNumSets(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-2xl font-bold text-center text-white focus:border-emerald-500 outline-none" 
                                placeholder="4"
                            />
                        </div>

                        {/* Exercise 1 Inputs */}
                        <div className="p-3 bg-zinc-800/30 rounded-xl">
                            {isBiserie && <label className="text-xs text-emerald-400 font-bold uppercase mb-2 block">{exName1}</label>}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Peso</label>
                                    <input 
                                        type="number" 
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-2xl font-bold text-center text-white focus:border-emerald-500 outline-none placeholder-zinc-700" 
                                        placeholder={exercise.lastWeight || "0"}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Reps</label>
                                    <input 
                                        type="number" 
                                        value={reps}
                                        onChange={e => setReps(e.target.value)}
                                        placeholder={exercise.lastReps || "10"}
                                        className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-2xl font-bold text-center text-white focus:border-emerald-500 outline-none placeholder-zinc-700" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Exercise 2 Inputs (If Biserie) */}
                        {isBiserie && (
                            <div className="p-3 bg-zinc-800/30 rounded-xl">
                                <label className="text-xs text-blue-400 font-bold uppercase mb-2 block">{exName2}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold">Peso 2</label>
                                        <input 
                                            type="number" 
                                            value={weight2}
                                            onChange={e => setWeight2(e.target.value)}
                                            className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-2xl font-bold text-center text-white focus:border-blue-500 outline-none placeholder-zinc-700" 
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold">Reps 2</label>
                                        <input 
                                            type="number" 
                                            value={reps2}
                                            onChange={e => setReps2(e.target.value)}
                                            placeholder="10"
                                            className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-2xl font-bold text-center text-white focus:border-blue-500 outline-none placeholder-zinc-700" 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <BigButton 
                        onClick={handleComplete}
                        className={isLast ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                        <CheckCircle className="w-6 h-6 mr-2" /> 
                        {isLast ? "FINALIZAR ENTRENO" : "SIGUIENTE EJERCICIO"}
                    </BigButton>
                </div>
            )}
        </div>
    )
}

function PostWorkoutModal({ onClose, onSave, routineName, durationSeconds, userWeight }) {
    const [didCardio, setDidCardio] = useState(false);
    const [cardioTime, setCardioTime] = useState(''); 
    const [intensity, setIntensity] = useState('Medium');
    const [step, setStep] = useState(1);
    
    const calculateCalories = () => {
        // Reverted to simple formula: 0.06 kcal/kg/min (approx 3.5 METs)
        const durationMinutes = durationSeconds / 60;
        const liftCals = 0.06 * userWeight * durationMinutes;
        
        let cardioCals = 0;
        if (didCardio) {
            let cardioMET = 7.0; // Medium default
            if (intensity === 'Low') cardioMET = 5.0;
            if (intensity === 'High') cardioMET = 10.0;
            
            const cardioMinutesVal = Number(cardioTime) || 0;
            // Formula: MET * Weight * Hours
            cardioCals = cardioMET * userWeight * (cardioMinutesVal / 60);
        }
        
        return Math.floor(liftCals + cardioCals);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 animate-in slide-in-from-bottom-20">
                <h2 className="text-2xl font-bold text-white mb-6">Resumen Sesión</h2>

                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-zinc-400 block mb-2">¿Hiciste Cardio?</label>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setDidCardio(true)}
                                    className={cn("flex-1 py-4 rounded-xl border border-zinc-700 font-bold", didCardio ? "bg-emerald-500 text-black border-emerald-500" : "bg-black text-white")}
                                >
                                    SÍ
                                </button>
                                <button 
                                    onClick={() => setDidCardio(false)}
                                    className={cn("flex-1 py-4 rounded-xl border border-zinc-700 font-bold", !didCardio ? "bg-zinc-700 text-white" : "bg-black text-white")}
                                >
                                    NO
                                </button>
                            </div>
                        </div>

                        {didCardio && (
                            <div className="animate-in fade-in zoom-in">
                                <div className="mb-4">
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Minutos</label>
                                    <input 
                                        type="number" 
                                        value={cardioTime}
                                        onChange={e => setCardioTime(e.target.value)}
                                        className="w-full bg-black border p-3 rounded-xl text-white text-xl placeholder-zinc-700"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase mb-2 block">Intensidad</label>
                                    <div className="flex gap-2">
                                        {['Low', 'Medium', 'High'].map(lev => (
                                            <button 
                                                key={lev} 
                                                onClick={() => setIntensity(lev)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-sm font-bold border border-zinc-700",
                                                    intensity === lev ? "bg-white text-black" : "bg-black text-zinc-500"
                                                )}
                                            >
                                                {lev}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <BigButton onClick={() => setStep(2)}>
                            Continuar
                        </BigButton>
                         <button onClick={onClose} className="w-full mt-4 text-xs text-zinc-500">Cancelar</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="text-center py-6">
                        <Flame className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-zinc-400 uppercase tracking-widest text-xs font-bold">Calorías Totales</h3>
                        <p className="text-5xl font-black text-white my-2">{calculateCalories()}</p>
                        <p className="text-zinc-500 text-sm mb-8">Gran trabajo hoy, campeón.</p>

                        <BigButton onClick={() => onSave({ didCardio, cardioMinutes: cardioTime, cardioIntensity: intensity, totalCalories: calculateCalories() })}>
                            GUARDAR WORKOUT
                        </BigButton>
                         <button onClick={() => setStep(1)} className="mt-4 text-sm text-zinc-500 underline">
                            Volver
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div className="text-white p-10">Cargando...</div>}>
            <WorkoutRunner />
        </Suspense>
    )
}
