"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, Moon } from "lucide-react";

const MUSCLE_GROUPS = [
  { value: "Pecho/Espalda", label: "Pecho / Espalda" },
  { value: "Pecho/Triceps", label: "Pecho / Tríceps" },
  { value: "Espalda/Biceps", label: "Espalda / Bíceps" },
  { value: "Pierna", label: "Pierna" },
  { value: "Brazos", label: "Brazos" },
];

const WORKOUT_STEPS = ["muscle", "exercises", "cardio", "duration", "feeling", "summary"];
const REST_STEPS = ["muscle", "cardio", "summary"];

export default function WorkoutLogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#00C853] animate-spin" />
      </div>
    }>
      <WorkoutLogContent />
    </Suspense>
  );
}

function WorkoutLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetDate = searchParams.get("date"); // yyyy-MM-dd from home page
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [ambiguities, setAmbiguities] = useState([]);
  const [exerciseSuggestions, setExerciseSuggestions] = useState({});

  // Form state
  const [muscleGroup, setMuscleGroup] = useState("");
  const [exerciseCount, setExerciseCount] = useState(1);
  const [exercises, setExercises] = useState([
    { name: "", weight: "", sets: "", reps: "" },
  ]);
  const [didCardio, setDidCardio] = useState(false);
  const [cardioType, setCardioType] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [feeling, setFeeling] = useState("");

  const STEPS = isRestDay ? REST_STEPS : WORKOUT_STEPS;
  const currentStep = STEPS[step];

  const updateExercise = (index, field, value) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (field === "name") {
      const trimmed = value.trim();
      if (!trimmed) {
        setExerciseSuggestions((prev) => ({ ...prev, [index]: [] }));
        return;
      }

      fetch(`/api/exercises?query=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((data) => {
          setExerciseSuggestions((prev) => ({
            ...prev,
            [index]: data.suggestions || [],
          }));
        })
        .catch(() => {
          setExerciseSuggestions((prev) => ({ ...prev, [index]: [] }));
        });
    }
  };

  const chooseSuggestedExercise = (index, canonicalName) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: canonicalName };
      return updated;
    });
    setExerciseSuggestions((prev) => ({ ...prev, [index]: [] }));
  };

  const addExercise = () => {
    setExercises((prev) => [...prev, { name: "", weight: "", sets: "", reps: "" }]);
    setExerciseCount((c) => c + 1);
  };

  const removeExercise = (index) => {
    if (exercises.length <= 1) return;
    setExercises((prev) => prev.filter((_, i) => i !== index));
    setExerciseCount((c) => c - 1);
    setExerciseSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case "muscle":
        return !!muscleGroup;
      case "exercises":
        return exercises.every((e) => e.name.trim());
      case "cardio":
        if (!isRestDay) return true;
        if (!didCardio) return true;
        return !!cardioType.trim() && !!cardioMinutes;
      case "duration":
        return true;
      case "feeling":
        return true;
      case "summary":
        return !!aiResult;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === "cardio" && isRestDay) {
      setStep(step + 1);

      if (!didCardio) {
        setAiResult({
          totalCalories: 0,
          rirScore: 5,
          fatigueLevel: 1,
          analysis: "Dia de descanso total registrado. Recuperacion limpia para volver mas fuerte en la siguiente sesion.",
          normalizedExercises: [],
        });
        return;
      }

      await analyzeWorkout();
      return;
    }

    if (currentStep === "feeling") {
      // After feeling, trigger AI analysis then go to summary
      setStep(step + 1);
      await analyzeWorkout();
      return;
    }
    if (currentStep === "summary") {
      if (isRestDay) {
        await saveRestDay();
      } else {
        await saveWorkout();
      }
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep(step - 1);
  };

  const selectMuscleGroup = (value) => {
    if (value === "Descanso") {
      setMuscleGroup("Descanso");
      setIsRestDay(true);
    } else {
      setMuscleGroup(value);
      setIsRestDay(false);
    }
  };

  const analyzeWorkout = async () => {
    setAnalyzing(true);
    setAmbiguities([]);
    try {
      const res = await fetch("/api/coach/analyze-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muscleGroup,
          exercises: isRestDay
            ? []
            : exercises.map((e) => ({
                name: e.name,
                weight: parseFloat(e.weight) || 0,
                sets: parseInt(e.sets) || 1,
                reps: parseInt(e.reps) || 1,
              })),
          cardio: didCardio
            ? { type: cardioType, minutes: parseInt(cardioMinutes) || 0 }
            : null,
          feeling,
          durationMinutes: parseInt(durationMinutes) || (isRestDay && didCardio ? parseInt(cardioMinutes) || null : null),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.needsClarification) {
          setAmbiguities(data.ambiguousExercises || []);
          setStep(1);
          return;
        }
        setAiResult(data);
      } else {
        setAiResult({
          totalCalories: 300,
          rirScore: 2,
          fatigueLevel: 5,
          analysis: "No se pudo conectar con AI. Estimaciones por defecto.",
          normalizedExercises: [],
        });
      }
    } catch (e) {
      console.error("Analysis error:", e);
      setAiResult({
        totalCalories: 300,
        rirScore: 2,
        fatigueLevel: 5,
        analysis: "Error de conexion. Estimaciones por defecto.",
        normalizedExercises: [],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const resolveAmbiguity = (exerciseName, value) => {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.name === exerciseName ? { ...exercise, name: value } : exercise
      )
    );
    setAmbiguities((prev) => prev.filter((item) => item.original !== exerciseName));
  };

  const saveWorkout = async () => {
    if (!aiResult || saving) return;
    setSaving(true);

    // Apply normalized exercise names if available
    const normalizedMap = {};
    if (aiResult.normalizedExercises) {
      aiResult.normalizedExercises.forEach((ne) => {
        normalizedMap[ne.original?.toLowerCase()] = ne.normalized;
      });
    }

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muscleGroup,
          date: targetDate || undefined,
          durationMinutes: parseInt(durationMinutes) || null,
          totalCalories: aiResult.totalCalories,
          didCardio,
          cardioType: didCardio ? cardioType : null,
          cardioMinutes: didCardio ? parseInt(cardioMinutes) : null,
          fatigueLevel: aiResult.fatigueLevel,
          rirScore: aiResult.rirScore,
          feeling,
          exercises: exercises.map((e) => ({
            exerciseName:
              normalizedMap[e.name.trim().toLowerCase()] || e.name.trim(),
            weight: parseFloat(e.weight) || 0,
            sets: parseInt(e.sets) || 1,
            reps: parseInt(e.reps) || 1,
          })),
        }),
      });

      if (res.ok) {
        // Trigger daily report generation
        fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "daily" }),
        }).catch(() => {});

        router.push("/");
      }
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const saveRestDay = async () => {
    if (saving || !aiResult) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muscleGroup: "Descanso",
          date: targetDate || undefined,
          durationMinutes: parseInt(durationMinutes) || (didCardio ? parseInt(cardioMinutes) || null : 0),
          totalCalories: aiResult?.totalCalories ?? 0,
          didCardio,
          cardioType: didCardio ? cardioType : null,
          cardioMinutes: didCardio ? parseInt(cardioMinutes) || null : null,
          fatigueLevel: aiResult?.fatigueLevel ?? 1,
          rirScore: aiResult?.rirScore ?? 2,
          feeling: feeling || null,
          exercises: [],
        }),
      });

      if (res.ok) {
        // Trigger daily report generation for rest day
        fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "daily" }),
        }).catch(() => {});

        router.push("/");
      }
    } catch (e) {
      console.error("Save rest day error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold font-display">Registrar Entrenamiento</h1>
        <div className="w-9" />
      </div>

      {/* Step Indicator */}
      <div className="step-indicator justify-center mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`step-dot ${i === step ? "active" : i < step ? "completed" : ""}`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* ─── Step: Muscle Group ──────────────────────── */}
            {currentStep === "muscle" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Que grupo muscular?</h2>
                <div className="space-y-3">
                  {MUSCLE_GROUPS.map((mg) => (
                    <button
                      key={mg.value}
                      onClick={() => selectMuscleGroup(mg.value)}
                      className={`w-full glass-card p-4 text-left transition-all ${
                        muscleGroup === mg.value
                          ? "!border-[#00C853] bg-[#00C853]/5"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="text-base font-medium">{mg.label}</span>
                    </button>
                  ))}

                  {/* Descanso option */}
                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                    <button
                      onClick={() => selectMuscleGroup("Descanso")}
                      className={`w-full glass-card p-4 text-left transition-all mt-3 ${
                        muscleGroup === "Descanso"
                          ? "!border-[#2196F3] bg-[#2196F3]/5"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Moon className="w-4 h-4 text-[#2196F3]" />
                        <span className="text-base font-medium">Descanso</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 ml-7">
                        Registrar dia de descanso
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step: Exercises ─────────────────────────── */}
            {currentStep === "exercises" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Ejercicios</h2>
                <p className="text-sm text-zinc-500">
                  Escribe el nombre libremente. La AI lo interpreta.
                </p>

                {ambiguities.length > 0 && (
                  <div className="glass-card border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
                    <p className="text-sm text-amber-200 font-medium">
                      Antes de guardar necesito aclarar algunos ejercicios.
                    </p>
                    {ambiguities.map((item) => (
                      <div key={item.original} className="space-y-2">
                        <p className="text-xs text-zinc-400">{item.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {item.options?.map((option) => (
                            option.slug === "other" ? (
                              <input
                                key={`${item.original}-other`}
                                type="text"
                                placeholder="Otro ejercicio..."
                                className="input-dark max-w-[220px]"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const value = e.currentTarget.value.trim();
                                    if (value) resolveAmbiguity(item.original, value);
                                  }
                                }}
                              />
                            ) : (
                              <button
                                key={`${item.original}-${option.canonicalName}`}
                                onClick={() => resolveAmbiguity(item.original, option.canonicalName)}
                                className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                              >
                                {option.canonicalName}
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {exercises.map((ex, i) => (
                    <div key={i} className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500 font-medium">
                          Ejercicio {i + 1}
                        </span>
                        {exercises.length > 1 && (
                          <button
                            onClick={() => removeExercise(i)}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => updateExercise(i, "name", e.target.value)}
                        placeholder="Ej: Press banca, sentadilla, curl..."
                        className="input-dark"
                      />
                      {exerciseSuggestions[i]?.length > 0 && (
                        <div className="rounded-2xl border border-white/5 bg-black/30 p-2 space-y-1">
                          {exerciseSuggestions[i].map((suggestion) => (
                            <button
                              key={`${i}-${suggestion.slug}`}
                              type="button"
                              onClick={() => chooseSuggestedExercise(i, suggestion.canonicalName)}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
                            >
                              <span>{suggestion.canonicalName}</span>
                              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                                {suggestion.equipment || "libre"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1 block">
                            Peso (kg)
                          </label>
                          <input
                            type="number"
                            value={ex.weight}
                            onChange={(e) => updateExercise(i, "weight", e.target.value)}
                            placeholder="0"
                            className="input-dark text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1 block">
                            Series
                          </label>
                          <input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(i, "sets", e.target.value)}
                            placeholder="3"
                            className="input-dark text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1 block">
                            Reps
                          </label>
                          <input
                            type="number"
                            value={ex.reps}
                            onChange={(e) => updateExercise(i, "reps", e.target.value)}
                            placeholder="10"
                            className="input-dark text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addExercise}
                    className="w-full glass-card p-3 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar ejercicio
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step: Cardio ───────────────────────────── */}
            {currentStep === "cardio" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">
                  {isRestDay ? "Haras cardio hoy?" : "Hiciste cardio?"}
                </h2>
                {isRestDay && (
                  <p className="text-sm text-zinc-500">
                    Puedes registrar un dia de descanso total o un descanso activo con cardio.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDidCardio(false);
                      setCardioType("");
                      setCardioMinutes("");
                    }}
                    className={`flex-1 glass-card p-4 text-center transition-all ${
                      !didCardio ? "!border-[#00C853] bg-[#00C853]/5" : ""
                    }`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setDidCardio(true)}
                    className={`flex-1 glass-card p-4 text-center transition-all ${
                      didCardio ? "!border-[#00C853] bg-[#00C853]/5" : ""
                    }`}
                  >
                    Si
                  </button>
                </div>

                {didCardio && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      value={cardioType}
                      onChange={(e) => setCardioType(e.target.value)}
                      placeholder="Tipo: caminadora, eliptica, bici..."
                      className="input-dark"
                    />
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">
                        Duracion (minutos)
                      </label>
                      <input
                        type="number"
                        value={cardioMinutes}
                        onChange={(e) => setCardioMinutes(e.target.value)}
                        placeholder="20"
                        className="input-dark"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ─── Step: Duration ─────────────────────────── */}
            {currentStep === "duration" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Duracion total</h2>
                <p className="text-sm text-zinc-500">
                  {isRestDay
                    ? "Cuanto tiempo duro tu descanso activo o cardio?"
                    : "Cuanto tiempo duro tu sesion completa? (aproximado)"}
                </p>
                <div>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                    className="input-dark text-center text-2xl font-display"
                  />
                  <p className="text-center text-xs text-zinc-500 mt-2">minutos</p>
                </div>
              </div>
            )}

            {/* ─── Step: Feeling ──────────────────────────── */}
            {currentStep === "feeling" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Como te sentiste?</h2>
                <p className="text-sm text-zinc-500">
                  {isRestDay
                    ? "Escribe libremente. La AI evaluara tu descanso o cardio suave."
                    : "Escribe libremente. La AI genera tu RIR estimado y fatiga."}
                </p>
                <textarea
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder={isRestDay
                    ? "Ej: Hice 35 min de caminadora suave. Me senti ligero y aproveche para recuperarme."
                    : "Ej: Me senti bien, subi peso en press banca. Un poco cansado de las piernas de ayer..."}
                  rows={4}
                  className="input-dark resize-none"
                />
              </div>
            )}

            {/* ─── Step: Summary ──────────────────────────── */}
            {currentStep === "summary" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Resumen</h2>

                {analyzing ? (
                  <div className="glass-card p-8 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#00C853] animate-spin" />
                    <p className="text-sm text-zinc-400">AI analizando tu sesion...</p>
                  </div>
                ) : aiResult ? (
                  <div className="space-y-4">
                    {/* AI Analysis */}
                    <div className="glass-card p-4 space-y-3">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {aiResult.analysis}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="glass-card p-3 text-center">
                        <p className="text-2xl font-bold font-display text-[#00C853]">
                          {aiResult.totalCalories}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">kcal</p>
                      </div>
                      <div className="glass-card p-3 text-center">
                        <p className="text-2xl font-bold font-display text-[#2196F3]">
                          {aiResult.rirScore}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">RIR</p>
                      </div>
                      <div className="glass-card p-3 text-center">
                        <p className="text-2xl font-bold font-display text-orange-400">
                          {aiResult.fatigueLevel}/10
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">Fatiga</p>
                      </div>
                    </div>

                    {/* Workout Details */}
                    <div className="glass-card p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Grupo</span>
                        <span>{isRestDay && didCardio ? "Descanso activo" : muscleGroup}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Duracion</span>
                        <span>{durationMinutes || (isRestDay && didCardio ? cardioMinutes : "?")} min</span>
                      </div>
                      {didCardio && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Cardio</span>
                          <span>{cardioType} - {cardioMinutes} min</span>
                        </div>
                      )}
                      {!isRestDay && exercises.length > 0 && (
                        <div className="border-t border-white/5 pt-2 mt-2 space-y-1.5">
                          {exercises.map((ex, i) => {
                            const normalized = aiResult.normalizedExercises?.find(
                              (ne) => ne.original?.toLowerCase() === ex.name.trim().toLowerCase()
                            );
                            return (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-zinc-300">
                                  {normalized?.normalized || ex.name}
                                </span>
                                <span className="text-zinc-500 font-display">
                                  {ex.weight}kg {ex.sets}x{ex.reps}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action */}
      <div className="mt-8">
        <button
          onClick={handleNext}
          disabled={!canProceed() || saving || analyzing}
          className="w-full rounded-2xl bg-[#00C853] py-4 text-black font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
            </>
          ) : currentStep === "summary" ? (
            <>
              <Check className="w-4 h-4" /> Confirmar y guardar
            </>
          ) : currentStep === "cardio" && isRestDay ? (
            <>
              {didCardio ? "Analizar descanso activo" : "Registrar descanso"} <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Siguiente <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
