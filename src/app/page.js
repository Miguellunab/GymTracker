"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { AICoachTrigger } from "@/components/coach/AICoachTrigger";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [calendarData, setCalendarData] = useState({});
  const [daySession, setDaySession] = useState(null);
  const [coachTip, setCoachTip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize dates only on client to avoid SSR/hydration mismatch
  useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
    setMounted(true);
  }, []);

  // Generate 7 days for the week
  const weekDays = weekStart
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [];

  // Fetch calendar data for visible range
  const fetchCalendar = useCallback(async () => {
    if (!weekStart) return;
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

  // Fetch session for selected day
  const fetchDaySession = useCallback(async () => {
    if (!selectedDate) return;
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

  // Fetch daily coach tip
  const fetchCoachTip = useCallback(async () => {
    if (!selectedDate) return;
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

  // Initial data load + whenever selected date changes
  useEffect(() => {
    if (!mounted || !selectedDate || !weekStart) return;

    let cancelled = false;
    setLoading(true);

    async function loadData() {
      await Promise.all([fetchDaySession(), fetchCalendar()]);
      if (!cancelled) setLoading(false);
      // Coach tip loads independently (slower, not blocking UI)
      fetchCoachTip();
    }

    loadData();
    return () => { cancelled = true; };
  }, [mounted, fetchDaySession, fetchCalendar, fetchCoachTip]);

  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));

  // Before mount, render loading skeleton
  if (!mounted || !selectedDate || !weekStart) {
    return (
      <div className="pt-12 pb-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isToday = isSameDay(selectedDate, new Date());
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  return (
    <div className="pt-12 pb-8 space-y-6">
      {/* Greeting + Date */}
      <div>
        <h1 className="text-2xl font-bold font-display capitalize">
          {isToday ? "Hoy" : format(selectedDate, "EEEE", { locale: es })}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
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
            const hasWorkout = !!calendarData[dateStr];
            const isDayToday = isSameDay(day, new Date());

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                className={`day-pill ${isSelected ? "active" : hasWorkout ? "has-workout" : "rest"}`}
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

      {/* Day Data Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDateStr}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Stats Grid */}
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label flex items-center gap-1.5">
                <Dumbbell className="w-3 h-3" /> Grupo
              </span>
              <span className="stat-value text-base">
                {daySession?.muscleGroup || "Descanso"}
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
                <Zap className="w-3 h-3" /> NIT
              </span>
              <span className="stat-value">
                {daySession?.nitRating || 0}
                <span className="text-xs font-normal text-zinc-500 ml-1">/10</span>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00C853]" />
            <span className="text-xs font-semibold text-[#00C853]">
              {coachTip.action || "Coach Tip"}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{coachTip.message}</p>
        </motion.div>
      )}

      {/* AI Coach Card */}
      <AICoachTrigger />

      {/* FAB - Register Workout */}
      <button
        onClick={() => router.push("/workout/log")}
        className="fab"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm">Registrar</span>
      </button>
    </div>
  );
}
