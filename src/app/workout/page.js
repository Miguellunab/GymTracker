"use client";

import TimerWidget from "@/components/timer/TimerWidget";
import { BigButton } from "@/components/core/BigButton";
import { Dumbbell, CalendarDays, History } from "lucide-react";

export default function WorkoutPage() {
    return (
        <main className="min-h-screen p-4 flex flex-col gap-8 max-w-lg mx-auto">

            {/* Header */}
            <header className="flex justify-between items-end mt-4 px-2">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                        GymTracker
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium">No excuses.</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-500">PRO</span>
                </div>
            </header>

            {/* Main Timer (Always accessible) */}
            <section>
                <TimerWidget />
            </section>

            {/*
            <section className="space-y-4">
                <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-widest px-2">Sesión</h2>

                <div className="grid gap-3">
                    <BigButton variant="primary" className="h-24 text-2xl">
                        <Dumbbell className="w-8 h-8 mr-3" />
                        Iniciar Workout
                    </BigButton>

                    <div className="grid grid-cols-2 gap-3">
                        <BigButton variant="neutral" className="bg-zinc-900">
                            <History className="w-6 h-6 mr-2 text-zinc-500" /> Log
                        </BigButton>
                        <BigButton variant="neutral" className="bg-zinc-900">
                            <CalendarDays className="w-6 h-6 mr-2 text-zinc-500" /> Stats
                        </BigButton>
                    </div>
                </div>
            </section>
            */}

        </main>
    );
}
