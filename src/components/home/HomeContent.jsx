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
  const [fabOpen, setFabOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteWorkout = async () => {
    if (!daySession?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workouts?id=${daySession.id}`, { method: "DELETE" });
      if (res.ok) {
        setDaySession(null);
        setFabOpen(false);
        fetchCalendar();
      }
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setDeleting(false);
    }
  };

  const isToday = isSameDay(selectedDate, new Date());
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

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
          initial={hasMounted.current ? { opacity: 0, y: 10 } : false}
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

      {/* FAB Overlay (blur backdrop) */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Menu Items */}
      <AnimatePresence>
        {fabOpen && (
          <>
            {/* Registrar option */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              onClick={() => {
                setFabOpen(false);
                router.push(`/workout/log?date=${format(selectedDate, "yyyy-MM-dd")}`);
              }}
              className="fixed z-50 flex items-center gap-3 rounded-full pl-4 pr-5 py-3 font-semibold shadow-xl bg-[#00C853] text-black"
              style={{
                bottom: `calc(${daySession ? "14rem" : "10rem"} + env(safe-area-inset-bottom))`,
                right: "1rem"
              }}
            >
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm">Registrar</span>
            </motion.button>

            {/* Eliminar option (only if there's a workout) */}
            {daySession && (
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                onClick={handleDeleteWorkout}
                disabled={deleting}
                className="fixed z-50 flex items-center gap-3 rounded-full pl-4 pr-5 py-3 font-semibold shadow-xl bg-red-500/90 text-white disabled:opacity-50"
                style={{
                  bottom: `calc(10rem + env(safe-area-inset-bottom))`,
                  right: "1rem"
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">{deleting ? "Eliminando..." : "Eliminar"}</span>
              </motion.button>
            )}
          </>
        )}
      </AnimatePresence>

      {/* FAB Button (+ icon, rotates to X when open) */}
      <motion.button
        onClick={() => setFabOpen(!fabOpen)}
        className="fixed z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl"
        style={{
          background: fabOpen ? "#333" : "var(--accent-green)",
          bottom: `calc(5.5rem + env(safe-area-inset-bottom))`,
          right: "1rem",
        }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          animate={{ rotate: fabOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" style={{ color: fabOpen ? "#fff" : "#000" }} />
        </motion.div>
      </motion.button>
    </div>
  );
}
