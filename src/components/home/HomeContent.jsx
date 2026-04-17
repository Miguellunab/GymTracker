"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Flame,
  Clock,
  Zap,
  Activity,
  Dumbbell,
  Heart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { AICoachTrigger } from "@/components/coach/AICoachTrigger";

export default function HomeContent() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarData, setCalendarData] = useState({});
  const [daySession, setDaySession] = useState(null);
  const [coachTip, setCoachTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasMounted = useRef(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchCalendar = useCallback(async () => {
    try {
      const start = format(weekStart, "yyyy-MM-dd");
      const end = format(addDays(weekStart, 6), "yyyy-MM-dd");
      const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarData(data);
      }
    } catch (e) {
      console.error("Calendar fetch error:", e);
    }
  }, [weekStart]);

  const fetchDaySession = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(`/api/workouts?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setDaySession(data);
      } else {
        setDaySession(null);
      }
    } catch (e) {
      console.error("Day session fetch error:", e);
      setDaySession(null);
    }
  }, [selectedDate]);

  const fetchCoachTip = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(`/api/coach/daily?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setCoachTip(data);
      }
    } catch (e) {
      console.error("Coach tip fetch error:", e);
    }
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function loadData() {
      await Promise.all([fetchDaySession(), fetchCalendar()]);
      if (!cancelled) setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, [selectedDate, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCoachTip();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // Re-fetch data when coach AI modifies the DB
  useEffect(() => {
    const handleDataChanged = () => {
      fetchDaySession();
      fetchCalendar();
    };
    window.addEventListener("workout-data-changed", handleDataChanged);
    return () => window.removeEventListener("workout-data-changed", handleDataChanged);
  }, [fetchDaySession, fetchCalendar]);

  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const isToday = isSameDay(selectedDate, new Date());
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isActiveRestDay = daySession?.muscleGroup === "Descanso" && daySession?.didCardio;

  const getDisplayGroup = (session) => {
    if (!session) return "Descanso";
    if (session.muscleGroup === "Descanso" && session.didCardio) return "Descanso activo";
    return session.muscleGroup || "Descanso";
  };

  // Calculate Recovery Data
  const weeklyWorkouts = weekDays.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    return calendarData[dateStr];
  }).filter(Boolean);
  
  const trainingDaysCount = weeklyWorkouts.filter(w => w.sessionType === "training").length;
  const activeRestDaysCount = weeklyWorkouts.filter(w => w.sessionType === "active-rest").length;
  const totalRestDaysCount = weeklyWorkouts.filter(w => w.sessionType === "rest").length;
  const avgFatigue = weeklyWorkouts.filter(w => w.fatigue > 0).reduce((acc, curr, _, arr) => acc + curr.fatigue / arr.length, 0).toFixed(1);

  return (
    <div className="page-top pb-8 space-y-6" suppressHydrationWarning>
      {/* Greeting + Date */}
      <div>
        <h1 className="text-2xl font-bold font-display capitalize" suppressHydrationWarning>
          {isToday ? "Hoy" : format(selectedDate, "EEEE", { locale: es })}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5" suppressHydrationWarning>
          {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Horizontal Week Calendar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-zinc-400 capitalize">
            {format(weekStart, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-between gap-1">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isSelected = isSameDay(day, selectedDate);
            const sessionType = calendarData[dateStr]?.sessionType;
            const hasWorkout = !!calendarData[dateStr] && sessionType === "training";
            const isActiveRest = sessionType === "active-rest";
            const isRestDay = !hasWorkout && !isActiveRest;
            const isDayToday = isSameDay(day, new Date());

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                className={`day-pill ${isSelected ? "active" : hasWorkout ? "has-workout" : isActiveRest ? "active-rest" : isRestDay ? "rest" : "empty"}`}
              >
                <span className="text-[10px] font-medium opacity-60">
                  {format(day, "EEE", { locale: es }).slice(0, 2).toUpperCase()}
                </span>
                <span className="text-lg font-bold font-display">
                  {format(day, "d")}
                </span>
                {isDayToday && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-[#00C853] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recovery Dashboard */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2196F3]" />
          Dashboard de Recuperacion (Semana)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-zinc-400">Dias de Entrenamiento</p>
            <p className="text-xl font-bold font-display text-white">{trainingDaysCount}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-zinc-400">Descanso Activo / Total</p>
            <p className="text-xl font-bold font-display text-white">{activeRestDaysCount} <span className="text-sm text-zinc-500 font-normal">/ {totalRestDaysCount}</span></p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 col-span-2 flex justify-between items-center">
            <p className="text-xs text-zinc-400">Fatiga Promedio</p>
            <p className="text-lg font-bold font-display text-[#FF9800]">{avgFatigue} <span className="text-xs font-normal text-zinc-500">/10</span></p>
          </div>
        </div>
      </div>

      {/* Day Data Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDateStr}
          initial={hasMounted.current ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {daySession && daySession.muscleGroup === "Descanso" && (
            <div className={`glass-card p-4 border ${isActiveRestDay ? "border-[#2196F3]/40 bg-[#2196F3]/8" : "border-white/5 bg-white/[0.02]"}`}>
              <p className={`text-sm font-semibold ${isActiveRestDay ? "text-[#7ec8ff]" : "text-zinc-300"}`}>
                {isActiveRestDay ? "Descanso activo" : "Descanso total"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {isActiveRestDay
                  ? `Cardio registrado: ${daySession.cardioType || "cardio"} ${daySession.cardioMinutes || 0} min`
                  : "Dia enfocado en recuperacion sin cardio registrado."}
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Dumbbell className="w-3 h-3" /> Grupo
              </span>
              <span className="stat-value text-base">
                {getDisplayGroup(daySession)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Flame className="w-3 h-3" /> Calorias
              </span>
              <span className="stat-value">
                {daySession?.totalCalories || 0}
                <span className="text-xs font-normal text-zinc-500 ml-1">kcal</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Duracion
              </span>
              <span className="stat-value">
                {daySession?.durationMinutes || 0}
                <span className="text-xs font-normal text-zinc-500 ml-1">min</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Fatiga
              </span>
              <span className="stat-value">
                {daySession?.fatigueLevel || 0}
                <span className="text-xs font-normal text-zinc-500 ml-1">/10</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> RIR
              </span>
              <span className="stat-value">
                {daySession?.rirScore ?? 0}
                <span className="text-xs font-normal text-zinc-500 ml-1">/5</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Heart className="w-3 h-3" /> Cardio
              </span>
              <span className="stat-value text-base">
                {daySession?.didCardio
                  ? `${daySession.cardioMinutes || 0} min`
                  : "No"}
              </span>
            </div>
          </div>

          {/* Exercises List */}
          {daySession?.sets && daySession.sets.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400">Ejercicios</h3>
              <div className="space-y-2">
                {daySession.sets.map((set, i) => (
                  <div key={set.id || i} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                    <span className="text-sm">{set.exerciseName}</span>
                    <span className="text-sm text-zinc-400 font-display">
                      {set.weight}kg {set.sets}x{set.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!daySession && !loading && (
            <div className="glass-card p-6 text-center">
              <p className="text-zinc-500 text-sm">Sin entrenamiento registrado</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Daily Coach Tip */}
      {coachTip && (
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00C853]" />
            <span className="text-xs font-semibold text-[#00C853]">
              {coachTip.action || "Coach Tip"}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{coachTip.message}</p>
        </div>
      )}

      {/* AI Coach Card */}
      <AICoachTrigger />
    </div>
  );
}
