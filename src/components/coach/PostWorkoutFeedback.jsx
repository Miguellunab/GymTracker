
/* 
  Trigger Component for Post Workout Feedback
  This will be mounted inside the PostWorkoutModal upon successful submission
*/

"use client";

import { useState, useEffect } from 'react';
import { Bot, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PostWorkoutFeedback({ routineName, durationSeconds, totalCalories, onDismiss }) {
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                // Determine effort label based on calories/time (basic heuristic)
                const calsPerMin = totalCalories / (durationSeconds / 60);
                let intensityLabel = "Moderado";
                if (calsPerMin > 8) intensityLabel = "Intenso";
                if (calsPerMin < 4) intensityLabel = "Ligero";

                const prompt = `
                    Acabo de terminar mi rutina de "${routineName}".
                    Duró ${Math.floor(durationSeconds / 60)} minutos y quemé aprox ${totalCalories} kcal (${intensityLabel}).
                    
                    Dame un feedback muy corto (1 frase) sobre si fue un buen entrenamiento.
                    Si fue muy corto (<20 min), regáñame suavemente.
                    Si fue intenso, felicítame.
                    Responde JSON: { "message": "texto", "rating": 1-5 }
                `;

                const res = await fetch('/api/coach/feedback', {
                    method: 'POST',
                    body: JSON.stringify({ prompt })
                });
                
                const data = await res.json();
                setFeedback(data);
            } catch (e) {
                console.error(e);
                setFeedback({ message: "¡Buen trabajo! Sigue así.", rating: 5 });
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [routineName, durationSeconds, totalCalories]);

    if (loading) return (
        <div className="mt-6 p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 animate-pulse text-center">
            <Bot className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-bounce" />
            <p className="text-zinc-500 text-xs">Analizando tu rendimiento...</p>
        </div>
    );

    return (
        <div className="mt-6 p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-emerald-900/30 relative overflow-hidden animate-in zoom-in duration-300">
             <div className="absolute top-0 right-0 p-3 opacity-10">
                <Bot className="w-16 h-16 text-emerald-500" />
             </div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Análisis del Coach</span>
                    <div className="flex">
                        {[...Array(5)].map((_, i) => (
                            <Star 
                                key={i} 
                                className={cn("w-3 h-3", i < feedback?.rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-700")} 
                            />
                        ))}
                    </div>
                </div>
                
                <p className="text-white text-sm font-medium leading-relaxed">
                    &quot;{feedback?.message}&quot;
                </p>

                <button 
                    onClick={onDismiss}
                    className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-zinc-300 transition-colors"
                >
                    Entendido
                </button>
             </div>
        </div>
    );
}
