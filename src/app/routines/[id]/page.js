"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, GripVertical, Trash2, Plus, Save, Search } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";
import { BigButton } from "@/components/core/BigButton";

export default function EditRoutinePage() {
    const { id } = useParams();
    const router = useRouter();
    
    // Data State
    const [routineName, setRoutineName] = useState("");
    const [allExercises, setAllExercises] = useState([]); // Master list
    const [routineExercises, setRoutineExercises] = useState([]); // In the routine
    
    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [routineRes, exercisesRes] = await Promise.all([
                    fetch(`/api/routines/${id}`),
                    fetch(`/api/exercises/list`)
                ]);
                
                const routineData = await routineRes.json();
                const exercisesData = await exercisesRes.json();

                if (routineData && exercisesData) {
                    setRoutineName(routineData.name);
                    setAllExercises(exercisesData);

                    // Map routine items to full exercise objects
                    const currentRoutineExercises = routineData.exercises.map(re => {
                        const original = exercisesData.find(e => e.id === re.exercise.id);
                        return original || { 
                             id: re.exercise.id, 
                             name: re.exercise.name, 
                             muscleGroup: re.exercise.muscleGroup 
                        };
                    });
                    setRoutineExercises(currentRoutineExercises);
                }
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Derived state: Pool is anything in All but NOT in Routine
    // We memoize or just calc on render. For 100 items it's fast enough.
    const poolExercises = allExercises
        .filter(ex => !routineExercises.find(r => r.id === ex.id))
        .filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleOnDragEnd = (result) => {
        const { source, destination } = result;

        // Dropped outside
        if (!destination) return;

        // Logic branches
        // 1. Reordering within Routine
        if (source.droppableId === "routine" && destination.droppableId === "routine") {
            const items = Array.from(routineExercises);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setRoutineExercises(items);
        }
        
        // 2. Pool -> Routine (Add)
        if (source.droppableId === "pool" && destination.droppableId === "routine") {
            const itemToAdd = poolExercises[source.index]; // Note: poolExercises is filtered!
            // Wait, if pool is filtered, index might be off if we use raw `poolExercises`. 
            // Correct: poolExercises IS the rendered list, so source.index should match.
            
            const newRoutine = Array.from(routineExercises);
            newRoutine.splice(destination.index, 0, itemToAdd);
            setRoutineExercises(newRoutine);
        }

        // 3. Routine -> Pool (Remove)
        if (source.droppableId === "routine" && destination.droppableId === "pool") {
            const items = Array.from(routineExercises);
            items.splice(source.index, 1);
            setRoutineExercises(items);
        }
    };

    // Manual add/remove (non-drag fallback)
    const addToRoutine = (exercise) => {
        setRoutineExercises([...routineExercises, exercise]);
    };

    const removeFromRoutine = (index) => {
        const newRoutine = [...routineExercises];
        newRoutine.splice(index, 1);
        setRoutineExercises(newRoutine);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/routines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    exercises: routineExercises.map((e, idx) => ({ 
                        exerciseId: e.id, 
                        order: idx 
                    })) 
                })
            });
            alert("Rutina actualizada correctamente");
            router.push('/routines');
        } catch(e) {
            alert("Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-white">Cargando editor...</div>;

    return (
        <div className="p-4 pb-32 max-w-2xl mx-auto">
             <header className="flex items-center gap-4 mb-6 mt-2">
                <Link href="/routines" className="bg-zinc-900 p-2 rounded-full border border-zinc-800">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </Link>
                <h1 className="text-xl font-bold text-white flex-1">Editar: {routineName}</h1>
            </header>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                
                {/* ---------- ROUTINE LIST ---------- */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase mb-3 flex justify-between">
                        En tu rutina
                        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300">
                            {routineExercises.length}
                        </span>
                    </h2>
                    
                    <Droppable droppableId="routine">
                        {(provided, snapshot) => (
                            <div 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className={`space-y-3 min-h-[100px] p-2 rounded-xl border-2 border-dashed transition-colors ${snapshot.isDraggingOver ? "border-green-500/50 bg-green-900/10" : "border-zinc-800 bg-black/20"}`}
                            >
                                {routineExercises.length === 0 && (
                                    <div className="text-center text-zinc-500 py-8 text-sm">
                                        Arrastra ejercicios aquí
                                    </div>
                                )}
                                {routineExercises.map((ex, index) => (
                                    <Draggable key={ex.id} draggableId={ex.id} index={index}>
                                        {(provided) => (
                                            <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl flex items-center gap-3 shadow-sm group"
                                            >
                                                <div {...provided.dragHandleProps} className="text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold">{ex.name}</h4>
                                                    <span className="text-xs text-zinc-500 uppercase tracking-wider">{ex.muscleGroup}</span>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromRoutine(index)}
                                                    className="text-zinc-600 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                {/* ---------- POOL LIST ---------- */}
                <div>
                     <div className="sticky top-2 z-10 bg-black pb-4 pt-2 border-b border-zinc-800 mb-4">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase mb-3">Banco de Ejercicios</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input 
                                type="text"
                                placeholder="Buscar ejercicio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                        </div>
                    </div>

                    <Droppable droppableId="pool">
                         {(provided, snapshot) => (
                            <div 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className={`space-y-2 pb-20 ${snapshot.isDraggingOver ? "bg-red-900/10 rounded-xl" : ""}`}
                            >
                                {poolExercises.map((ex, index) => (
                                    <Draggable key={ex.id} draggableId={ex.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg flex items-center justify-between hover:border-zinc-700 transition-colors ${snapshot.isDragging ? "opacity-50" : ""}`}
                                            >
                                                <div>
                                                    <h4 className="text-zinc-300 font-medium">{ex.name}</h4>
                                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{ex.muscleGroup}</span>
                                                </div>
                                                <div className="bg-zinc-800 p-1.5 rounded-full text-zinc-400">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {poolExercises.length === 0 && (
                                    <div className="text-center text-zinc-600 py-4">No se encontraron ejercicios</div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </div>

            </DragDropContext>

            <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
                <BigButton onClick={handleSave} disabled={isSaving}>
                     <Save className="w-5 h-5 mr-2" />
                     {isSaving ? "Guardando..." : "Guardar Cambios"}
                </BigButton>
            </div>
        </div>
    );
}
