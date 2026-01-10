"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BigButton } from '@/components/core/BigButton';
import TimerWidget from '@/components/timer/TimerWidget';
import { ChevronDown, ChevronUp, CheckCircle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { MuscleMap } from '@/components/visualization/MuscleMap';
import { GifModal, GifChip } from '@/components/media/GifModal';

const EXERCISE_ID_OVERRIDE = {
    // Override map for spanish slugs -> specific exercise-db IDs
    'press-inclinado-con-mancuernas': 'Incline_Dumbbell_Press',
    'cristos-inversos': 'Reverse_Flyes',
    'press-de-pecho-inclinado-con-mancuernas': 'Incline_Dumbbell_Press',
    'press-de-banca-con-barra': 'Barbell_Bench_Press_-_Medium_Grip',
    'press-de-banca': 'Barbell_Bench_Press_-_Medium_Grip',
    'dominadas-con-lastre': 'Weighted_Pull_Ups',
    'dominadas': 'Pullups',
    'pull-ups': 'Pullups',
    'press-militar-con-mancuernas': 'Dumbbell_Shoulder_Press',
    'remo-con-barra': 'Bent_Over_Barbell_Row',
    'sentadilla-libre': 'Barbell_Squat',
    'sentadilla': 'Barbell_Squat',
    'squat': 'Barbell_Squat',
    'peso-muerto-rumano': 'Romanian_Deadlift',
    'peso-muerto': 'Deadlift',
    'deadlift': 'Deadlift',
    'extensiones-de-triceps': 'Triceps_Pushdown',
    'extensiones-de-tricep': 'Triceps_Pushdown',
    'face-pulls': 'Face_Pull',
    'face-pull': 'Face_Pull',
    'biserie-remo-con-barra-jalon-tras-nuca': 'Bent_Over_Barbell_Row',
    'jalon-al-pecho': 'Wide-Grip_Lat_Pulldown',
    'jalon': 'Wide-Grip_Lat_Pulldown',
    'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
    'maquina-de-aperturas-pec-deck': 'Butterfly',
    'pec-deck': 'Butterfly',
    'aperturas': 'Butterfly',
    'remo-abierto-en-maquina': 'Seated_Cable_Rows',
    'remo-sentado': 'Seated_Cable_Rows',
    // Pierna Cuádriceps
    'sentadilla-hack': 'Hack_Squat',
    'hack-squat': 'Hack_Squat',
    'prensa-de-piernas': 'Leg_Press',
    'leg-press': 'Leg_Press',
    'prensa': 'Leg_Press',
    'extension-de-cuadriceps': 'Leg_Extensions',
    'extensiones-de-cuadriceps': 'Leg_Extensions',
    'leg-extensions': 'Leg_Extensions',
    'sentadilla-bulgara': 'Barbell_Lunge',
    'bulgarian-split-squat': 'Barbell_Lunge',
    'zancadas': 'Barbell_Lunge',
    // Pierna Femoral
    'curl-femoral-sentado': 'Seated_Band_Hamstring_Curl',
    'curl-femoral-acostado': 'Lying_Leg_Curls',
    'leg-curl': 'Lying_Leg_Curls',
    'hip-thrust-en-maquina': 'Barbell_Hip_Thrust',
    'hip-thrust': 'Barbell_Hip_Thrust',
    'empuje-de-cadera': 'Barbell_Hip_Thrust',
    // Brazos
    'curl-inclinado': 'Incline_Dumbbell_Curl',
    'curl-martillo': 'Hammer_Curls',
    'press-frances': 'Lying_Triceps_Press',
    'extension-triceps': 'Triceps_Pushdown',
    'elevaciones-laterales': 'Dumbbell_Lateral_Raise',
    'elevaciones-posteriores': 'Bent_Over_Low-Pulley_Side_Lateral',
};

// Map to V2 API image names (for higher quality images with muscle highlighting)
const EXERCISE_V2_IMAGE_MAP = {
    'Butterfly': 'Lever-Pec-Deck-Fly-Chest',
    'Incline_Dumbbell_Press': 'Dumbbell-Incline-Fly-Chest',
    'Barbell_Bench_Press_-_Medium_Grip': 'Barbell-Bench-Press-Chest',
    'Wide-Grip_Lat_Pulldown': 'Cable-Lat-Pulldown-Back',
    'Seated_Cable_Rows': 'Cable-Seated-Row-Back',
    'Bent_Over_Barbell_Row': 'Barbell-Bent-Over-Row-Back',
    'Weighted_Pull_Ups': 'Weighted-Pull-Up-Back',
    'Pullups': 'Pull-Up-Back',
    'Dumbbell_Shoulder_Press': 'Dumbbell-Shoulder-Press-Shoulders',
    'Barbell_Squat': 'Barbell-Squat-Thighs',
    'Hack_Squat': 'Sled-Hack-Squat-Thighs',
    'Leg_Press': 'Sled-45-Degree-Leg-Press-Thighs',
    'Leg_Extensions': 'Lever-Leg-Extension-Thighs',
    'Barbell_Lunge': 'Barbell-Lunge-Thighs',
    'Romanian_Deadlift': 'Barbell-Romanian-Deadlift-Hips',
    'Lying_Leg_Curls': 'Lever-Lying-Leg-Curl-Hamstrings',
    'Seated_Band_Hamstring_Curl': 'Lever-Seated-Leg-Curl-Hamstrings',
    'Barbell_Hip_Thrust': 'Barbell-Hip-Thrust-Hips',
    'Triceps_Pushdown': 'Cable-Pushdown-Triceps',
    'Lying_Triceps_Press': 'Barbell-Lying-Triceps-Extension-Triceps',
    'Incline_Dumbbell_Curl': 'Dumbbell-Incline-Curl-Biceps',
    'Hammer_Curls': 'Dumbbell-Hammer-Curl-Biceps',
    'Dumbbell_Lateral_Raise': 'Dumbbell-Lateral-Raise-Shoulders',
};

const slugify = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

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
    const [gifModal, setGifModal] = useState({ open: false, title: '', url: '', source: '', imageUrls: null });
    const exerciseDbRef = useRef(null);
    const dbPromiseRef = useRef(null);
    
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

    const activeMuscles = exercises.map((ex) => ex.muscle).filter(Boolean);

    const ensureExerciseDb = async () => {
        if (exerciseDbRef.current) return exerciseDbRef.current;
        if (dbPromiseRef.current) return dbPromiseRef.current;
        const url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
        dbPromiseRef.current = fetch(url)
            .then((res) => res.json())
            .then((json) => {
                exerciseDbRef.current = json;
                return json;
            })
            .catch((err) => {
                console.error('Failed to load exercise-db manifest', err);
                dbPromiseRef.current = null;
                throw err;
            });
        return dbPromiseRef.current;
    };

    const normalizeName = (value = '') =>
        value
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .trim();

    const handleShowGif = async (exercise) => {
        const slug = slugify(exercise.name);
        const overrideId = EXERCISE_ID_OVERRIDE[slug];
        const fallbackId = overrideId || slug;
        
        const fallbackSource = `https://www.exercise-db.com/exercise/${fallbackId}`;

        let finalUrl = exercise.gifUrl;
        let finalSource = exercise.sourceUrl || fallbackSource;
        let imageUrls = [];

        if (!finalUrl) {
            try {
                const db = await ensureExerciseDb();
                
                // Try multiple matching strategies
                let match = null;
                
                // Strategy 1: Match by override ID
                if (overrideId) {
                    match = db.find((item) => item.id === overrideId || normalizeName(item.name) === normalizeName(exercise.name));
                }
                
                // Strategy 2: Match by normalized name
                if (!match) {
                    match = db.find((item) => normalizeName(item.name) === normalizeName(exercise.name));
                }
                
                // Strategy 3: Partial match (contains the exercise name)
                if (!match) {
                    const exerciseNameNorm = normalizeName(exercise.name);
                    match = db.find((item) => {
                        const itemNameNorm = normalizeName(item.name);
                        return itemNameNorm.includes(exerciseNameNorm) || exerciseNameNorm.includes(itemNameNorm);
                    });
                }
                
                if (match) {
                    const id = match.id || fallbackId;
                    
                    // Get all images to create animated slideshow effect
                    if (match.images && match.images.length > 0) {
                        imageUrls = match.images.map(img => 
                            `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
                        );
                        finalUrl = imageUrls[0]; // First image as fallback
                    } else {
                        finalUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}/0.jpg`;
                    }
                    
                    finalSource = match.url || `https://www.exercise-db.com/exercise/${id}`;
                } else {
                    console.warn(`No match found for exercise: ${exercise.name}`);
                    finalUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${fallbackId}/0.jpg`;
                }
            } catch (err) {
                console.warn("ExerciseDB lookup failed, using fallback", err);
                finalUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${fallbackId}/0.jpg`;
            }
        }
        
        // Absolute fallback
        if(!finalUrl) {
            finalUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${fallbackId}/0.jpg`;
        }

        setGifModal({
            open: true,
            title: exercise.name,
            url: finalUrl,
            source: finalSource,
            imageUrls: imageUrls.length > 1 ? imageUrls : null, // Only pass if multiple images
        });
    };

    return (
        <div className="min-h-screen bg-transparent pb-8">
             {/* Sticky Header with Timer */}
             <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-800/50 bg-black/90 px-4 pb-4 pt-2 backdrop-blur-md shadow-lg">
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

                {activeMuscles.length > 0 && (
                    <div className="mt-6">
                        <MuscleMap activeMuscles={activeMuscles} />
                    </div>
                )}

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
                            onShowGif={() => handleShowGif(ex)}
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

            <GifModal 
                open={gifModal.open}
                onClose={() => setGifModal((prev) => ({ ...prev, open: false }))}
                title={gifModal.title}
                gifUrl={gifModal.url}
                sourceUrl={gifModal.source}
                imageUrls={gifModal.imageUrls}
            />
        </div>
    );
}

function ExerciseCard({ exercise, isExpanded, onToggle, sets, onSaveSet, onNext, isLast, onShowGif }) {
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
        <div className="bg-zinc-900/70 rounded-2xl overflow-hidden border border-zinc-800 transition-all backdrop-blur">
            <button 
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between bg-zinc-800/60"
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
                     <div className="flex justify-between items-start mb-4 gap-3">
                        <p className="text-zinc-500 text-sm italic">{exercise.notes}</p>
                        {exercise.lastWeight && (
                            <div className="text-right">
                                <span className="text-[10px] text-zinc-500 uppercase block">Anterior</span>
                                <span className="text-xs text-emerald-500 font-mono">
                                    {exercise.lastWeight}kg × {exercise.lastReps}
                                </span>
                            </div>
                        )}
                        <GifChip onClick={onShowGif} />
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
    const [manualDuration, setManualDuration] = useState(Math.floor(durationSeconds / 60).toString());
    
    const calculateCalories = () => {
        // Usar duración manual ingresada por el usuario
        const durationMinutes = Number(manualDuration) || 0;
        
        // Factor de intensidad según tipo de rutina
        let intensityFactor = 0.06; // Base: 0.06 kcal/kg/min (aprox 3.5 METs)
        
        // Pierna tiene mayor consumo calórico (frecuencia cardíaca más alta)
        const routineLower = routineName.toLowerCase();
        if (routineLower.includes('pierna') || routineLower.includes('cuadriceps') || 
            routineLower.includes('femoral') || routineLower.includes('leg')) {
            intensityFactor = 0.08; // 33% más calorías para pierna
        }
        
        const liftCals = intensityFactor * userWeight * durationMinutes;
        
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
                            <label className="text-zinc-400 block mb-2 text-sm font-bold">⏱️ Duración Real (minutos)</label>
                            <input 
                                type="number" 
                                value={manualDuration}
                                onChange={e => setManualDuration(e.target.value)}
                                className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-2xl text-center placeholder-zinc-700 font-bold"
                                placeholder="60"
                            />
                            <p className="text-zinc-600 text-xs mt-2">Ingresa la duración de tu smartwatch</p>
                        </div>

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
                        <p className="text-zinc-500 text-sm mb-2">{manualDuration} min de entrenamiento</p>
                        <p className="text-zinc-500 text-sm mb-8">Gran trabajo hoy, campeón.</p>

                        <BigButton onClick={() => onSave({ 
                            didCardio, 
                            cardioMinutes: cardioTime, 
                            cardioIntensity: intensity, 
                            totalCalories: calculateCalories(),
                            durationSeconds: Number(manualDuration) * 60 // Guardar duración manual
                        })}>
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
