"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Plus, Trash2, ChevronRight, Edit3 } from "lucide-react";
import Link from "next/link";
import { BigButton } from "@/components/core/BigButton";

export default function RoutinesPage() {
    const [routines, setRoutines] = useState([]);
    
    useEffect(() => {
        fetch('/api/routines/list')
            .then(res => res.json())
            .then(data => setRoutines(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="p-4 pb-24">
            <h1 className="text-3xl font-bold text-white mb-6 mt-4">Mis Rutinas</h1>
            
            <div className="grid gap-4">
                {routines.map(routine => (
                    <Link key={routine.id} href={`/routines/${routine.id}`}>
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                                    <Dumbbell className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">{routine.name}</h3>
                                    <p className="text-xs text-zinc-500">{routine._count?.exercises || 0} Ejercicios</p>
                                </div>
                            </div>
                            <ChevronRight className="text-zinc-600" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Floating Action Button? Or just bottom */}
            {/* User might want to create new ones later */}
        </div>
    );
}
