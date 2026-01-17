"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ThumbsUp, ThumbsDown, ArrowRight, Save, Clock, Flame } from 'lucide-react';
import { BigButton } from '@/components/core/BigButton';

export function AIWorkoutLogger({ routineName, exercises, onComplete }) {
  const [step, setStep] = useState('selection'); // selection, logging, cardio, feedback, analysis
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [workoutData, setWorkoutData] = useState({});
  const [cardioData, setCardioData] = useState({ didCardio: false });
  const [feedbackText, setFeedbackText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const toggleExercise = (exId) => {
    if (selectedExercises.includes(exId)) {
      setSelectedExercises(prev => prev.filter(id => id !== exId));
    } else {
      setSelectedExercises(prev => [...prev, exId]);
    }
  };

  const updateExerciseLog = (exId, sets, reps, weight, rir) => {
    setWorkoutData(prev => ({
      ...prev,
      [exId]: { sets, reps, weight, rir }
    }));
  };

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setStep('analysis');

    try {
      // Prepare data for AI
      const payload = {
        routineName,
        exercises: selectedExercises.map(id => {
          const ex = exercises.find(e => e.id === id);
          const log = workoutData[id];
          return {
            name: ex.name,
            sets: log.sets,
            reps: log.reps,
            weight: log.weight,
            rir: log.rir
          };
        }),
        cardio: cardioData,
        userFeedback: feedbackText,
        // userWeight is fetched server side or passed as prop if needed
      };

      const res = await fetch('/api/coach/analyze-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setAnalysisResult(data);
      
      if (onComplete) {
        // Transform internal logging format to API expected format
        // Internal: { exId: { sets: 4, reps: 12, weight: 50, ... } }
        // Expected API: { exId: [ { weight, reps, ... }, { weight, reps, ... } ] }
        
        const formattedLogs = {};
        Object.entries(workoutData).forEach(([exId, log]) => {
            const setsArray = [];
            const numSets = parseInt(log.sets) || 0;
            for(let i=0; i<numSets; i++) {
                setsArray.push({
                    weight: parseFloat(log.weight) || 0,
                    reps: parseInt(log.reps) || 0,
                    rir: parseInt(log.rir) || null
                });
            }
            if(setsArray.length > 0) formattedLogs[exId] = setsArray;
        });
        
        onComplete({
            analysis: data,
            logs: formattedLogs,
            cardio: cardioData,
            feedback: feedbackText
        });
      }

    } catch (error) {
      console.error(error);
      alert('Error analyzing workout. Please try again.');
      setStep('feedback'); // Go back
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (step === 'selection') {
    // Group exercises by muscle group for better UI
    const groupedExercises = exercises.reduce((acc, ex) => {
        const muscle = ex.muscle || "Otros";
        if (!acc[muscle]) acc[muscle] = [];
        acc[muscle].push(ex);
        return acc;
    }, {});

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-2">
          <Bot className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">¿Qué entrenaste hoy?</h2>
          <p className="text-sm text-zinc-400">Selecciona los ejercicios que realizaste realmente.</p>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {Object.entries(groupedExercises).map(([muscle, groupExs]) => (
                <div key={muscle} className="space-y-2">
                    <h3 className="text-emerald-400 font-bold text-sm uppercase sticky top-0 bg-black/80 backdrop-blur py-2 z-10 border-b border-zinc-800">
                        {muscle}
                    </h3>
                    <div className="grid gap-2">
                         {groupExs.map(ex => (
                            <div 
                              key={ex.id}
                              onClick={() => toggleExercise(ex.id)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedExercises.includes(ex.id) 
                                  ? 'bg-emerald-900/20 border-emerald-500/50' 
                                  : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${selectedExercises.includes(ex.id) ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                  {ex.name}
                                </span>
                                {selectedExercises.includes(ex.id) && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
                              </div>
                            </div>
                          ))}
                    </div>
                </div>
            ))}
        </div>

        <BigButton 
          disabled={selectedExercises.length === 0}
          onClick={() => setStep('logging')}
        >
          Siguiente <ArrowRight className="w-4 h-4 ml-2" />
        </BigButton>
      </div>
    );
  }

  if (step === 'logging') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-xl font-bold text-white mb-4">Detalles del Entreno</h2>
        
        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
          {selectedExercises.map(exId => {
            const ex = exercises.find(e => e.id === exId);
            return (
              <div key={exId} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                <h3 className="font-bold text-emerald-400">{ex.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">Series</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                      placeholder="4"
                      onChange={(e) => updateExerciseLog(exId, e.target.value, workoutData[exId]?.reps, workoutData[exId]?.weight, workoutData[exId]?.rir)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">Reps Promedio</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                      placeholder="12"
                      onChange={(e) => updateExerciseLog(exId, workoutData[exId]?.sets, e.target.value, workoutData[exId]?.weight, workoutData[exId]?.rir)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">Peso (kg/lbs)</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                      placeholder="20"
                      onChange={(e) => updateExerciseLog(exId, workoutData[exId]?.sets, workoutData[exId]?.reps, e.target.value, workoutData[exId]?.rir)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">RIR (Estimado)</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                      placeholder="1-3"
                      onChange={(e) => updateExerciseLog(exId, workoutData[exId]?.sets, workoutData[exId]?.reps, workoutData[exId]?.weight, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <BigButton onClick={() => setStep('cardio')}>
          Siguiente <ArrowRight className="w-4 h-4 ml-2" />
        </BigButton>
      </div>
    );
  }

  if (step === 'cardio') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-xl font-bold text-white">¿Hiciste Cardio?</h2>
        
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setCardioData({ ...cardioData, didCardio: true })}
                className={`p-6 rounded-xl border font-bold transition-all ${cardioData.didCardio ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
            >
                SÍ
            </button>
            <button 
                onClick={() => setCardioData({ didCardio: false })}
                className={`p-6 rounded-xl border font-bold transition-all ${!cardioData.didCardio ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
            >
                NO
            </button>
        </div>

        {cardioData.didCardio && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                    <label className="text-zinc-400 block mb-2 text-sm">Duración (minutos)</label>
                    <input 
                        type="number" 
                        className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-white text-lg"
                        placeholder="20"
                        onChange={(e) => setCardioData(prev => ({ ...prev, minutes: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="text-zinc-400 block mb-2 text-sm">Intensidad</label>
                    <div className="flex gap-2">
                        {['Baja', 'Media', 'Alta'].map((intensity) => (
                             <button
                                key={intensity}
                                onClick={() => setCardioData(prev => ({ ...prev, intensity }))}
                                className={`flex-1 py-2 rounded-lg text-sm border ${cardioData.intensity === intensity ? 'bg-white text-black border-white' : 'bg-black text-zinc-500 border-zinc-700'}`}
                             >
                                {intensity}
                             </button>
                        ))}
                    </div>
                </div>
             </div>
        )}

        <BigButton onClick={() => setStep('feedback')}>
          Siguiente <ArrowRight className="w-4 h-4 ml-2" />
        </BigButton>
      </div>
    );
  }

  if (step === 'feedback') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <div className="text-center">
            <Bot className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white">¿Cómo te sentiste?</h2>
            <p className="text-sm text-zinc-400 mb-6">Cuéntame brevemente cómo estuvo el entrenamiento. Me servirá para calcular mejor tu gasto calórico.</p>
        </div>
        
        <textarea 
            className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:border-emerald-500 outline-none resize-none"
            placeholder="Ej: Me sentí con mucha energía, subí peso en sentadilla. El cardio me costó un poco..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
        />

        <BigButton onClick={handleAnalysis} disabled={!feedbackText.trim()}>
          Calcular Resultados <Flame className="w-4 h-4 ml-2 text-orange-500" />
        </BigButton>
      </div>
    );
  }

  if (step === 'analysis') {
      return (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in fade-in">
              {isAnalyzing ? (
                  <>
                    <Bot className="w-16 h-16 text-emerald-500 animate-bounce" />
                    <h3 className="text-xl font-bold text-white">Analizando tu esfuerzo...</h3>
                    <p className="text-zinc-400 max-w-xs">Estoy calculando el volumen total, intensidad y estimando tus calorías exactas basado en tu feedback.</p>
                  </>
              ) : (
                  // This part should technically be handled by the parent or a success state, 
                  // but we can show a summary here if needed before redirection
                  <div className="text-emerald-400">
                      ¡Análisis Completado! Guardando...
                  </div>
              )}
          </div>
      )
  }

  return null;
}
