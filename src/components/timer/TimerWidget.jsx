"use client";

import { useTimerEngine } from "@/hooks/useTimerEngine";
import { BigButton } from "@/components/core/BigButton";
import { Play, Square, RotateCcw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TimerWidget() {
    const { timeLeft, formattedTime, isRunning, addTime, stopTimer } = useTimerEngine();

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Time Display */}
            <div className={cn(
                "relative flex items-center justify-center py-12 rounded-3xl border-2 transition-all duration-500",
                isRunning
                    ? "bg-zinc-900 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                    : "bg-zinc-950 border-zinc-800"
            )}>
                <span className={cn(
                    "text-[8rem] leading-none font-bold tracking-tighter font-sans tabular-nums select-none",
                    isRunning ? "text-white" : "text-zinc-600"
                )}>
                    {formattedTime}
                </span>

                {/* Status Label */}
                <div className="absolute top-4 right-6 uppercase tracking-widest text-xs font-bold text-zinc-500">
                    {isRunning ? "Resting" : "Ready"}
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-4 gap-2">
                {/* Quick Add Buttons */}
                <BigButton onClick={() => addTime(10)} variant="neutral">
                    <Plus className="w-5 h-5 mr-1 text-emerald-500" /> 10s
                </BigButton>
                <BigButton onClick={() => addTime(30)} variant="neutral">
                    <Plus className="w-5 h-5 mr-1 text-emerald-500" /> 30s
                </BigButton>
                <BigButton onClick={() => addTime(60)} variant="neutral">
                    <Plus className="w-5 h-5 mr-1 text-emerald-500" /> 60s
                </BigButton>
                <BigButton onClick={() => addTime(90)} variant="neutral">
                    <Plus className="w-5 h-5 mr-1 text-emerald-500" /> 90s
                </BigButton>
            </div>

            {isRunning && (
                <BigButton onClick={stopTimer} variant="danger" className="mt-2 text-red-500">
                    <Square className="w-6 h-6 mr-2 fill-current" /> STOP
                </BigButton>
            )}
        </div>
    );
}
