"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Flame,
  Clock,
  Activity,
  Zap,
  Calendar,
  TrendingUp,
} from "lucide-react";

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState({});
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/workouts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyReport = async (weekNumber, year) => {
    const key = `${year}-${weekNumber}`;
    if (weeklyReports[key]) return;

    try {
      const res = await fetch(`/api/reports?type=weekly&week=${weekNumber}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setWeeklyReports((prev) => ({ ...prev, [key]: data.content }));
      }
    } catch (e) {
      console.error("Weekly report fetch error:", e);
    }
  };

  // Group sessions by ISO week
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const groupedByWeek = sessions.reduce((acc, session) => {
    const date = new Date(session.date);
    const weekNum = getWeekNumber(date);
    const year = date.getFullYear();
    const key = `${year}-${weekNum}`;

    if (!acc[key]) {
      acc[key] = {
        weekNumber: weekNum,
        year,
        weekStart: startOfWeek(date, { weekStartsOn: 1 }),
        sessions: [],
      };
    }
    acc[key].sessions.push(session);
    return acc;
  }, {});

  const weeks = Object.entries(groupedByWeek).sort(
    ([a], [b]) => b.localeCompare(a)
  );

  const getDisplayGroup = (session) => {
    if (session.muscleGroup === "Descanso" && session.didCardio) return "Descanso activo";
    return session.muscleGroup;
  };

  const toggleWeek = (key) => {
    if (expandedWeek === key) {
      setExpandedWeek(null);
    } else {
      setExpandedWeek(key);
      const week = groupedByWeek[key];
      fetchWeeklyReport(week.weekNumber, week.year);
    }
  };

  if (loading) {
    return (
      <div className="page-top flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-top pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Historial</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Vista semanal de tus entrenamientos</p>
      </div>

      {weeks.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Sin entrenamientos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map(([key, week]) => {
            const isExpanded = expandedWeek === key;
            const weekEnd = addDays(week.weekStart, 6);
            const totalCals = week.sessions.reduce(
              (sum, s) => sum + (s.totalCalories || 0),
              0
            );
            const avgFatigue =
              week.sessions.reduce((sum, s) => sum + (s.fatigueLevel || 0), 0) /
                week.sessions.length || 0;

            return (
              <div key={key} className="glass-card overflow-hidden">
                {/* Week Header */}
                <button
                  onClick={() => toggleWeek(key)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold">
                      Semana {week.weekNumber}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {format(week.weekStart, "d MMM", { locale: es })} -{" "}
                      {format(weekEnd, "d MMM", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-display font-bold">
                        {week.sessions.length}
                        <span className="text-zinc-500 text-xs font-normal ml-1">dias</span>
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                        {/* Week Summary Stats */}
                        <div className="grid grid-cols-3 gap-2 pt-3">
                          <div className="text-center">
                            <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                            <p className="text-sm font-bold font-display">
                              {Math.round(totalCals)}
                            </p>
                            <p className="text-[10px] text-zinc-500">kcal total</p>
                          </div>
                          <div className="text-center">
                            <Activity className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                            <p className="text-sm font-bold font-display">
                              {avgFatigue.toFixed(1)}
                            </p>
                            <p className="text-[10px] text-zinc-500">fatiga prom</p>
                          </div>
                          <div className="text-center">
                            <TrendingUp className="w-4 h-4 text-[#00C853] mx-auto mb-1" />
                            <p className="text-sm font-bold font-display">
                              {week.sessions.length}/3
                            </p>
                            <p className="text-[10px] text-zinc-500">adherencia</p>
                          </div>
                        </div>

                        {/* AI Weekly Report */}
                        {weeklyReports[key] && (
                          <div className="bg-white/[0.02] rounded-xl p-3 space-y-2">
                            <p className="text-xs font-semibold text-[#00C853] flex items-center gap-1.5">
                              <Zap className="w-3 h-3" /> Reporte AI
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                              {weeklyReports[key]?.summary || "Sin reporte disponible."}
                            </p>
                            {weeklyReports[key]?.recommendations && (
                              <div className="space-y-1 mt-2">
                                {weeklyReports[key].recommendations.map((rec, i) => (
                                  <p key={i} className="text-[11px] text-zinc-500">
                                    - {rec}
                                  </p>
                                ))}
                              </div>
                            )}
                            {weeklyReports[key]?.weekGrade && (
                              <p className="text-xs text-zinc-500 mt-1">
                                Nota: <span className="font-bold text-white">{weeklyReports[key].weekGrade}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Day-by-day Detail */}
                        <div className="space-y-2">
                          {week.sessions
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((session) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {getDisplayGroup(session)}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {format(new Date(session.date), "EEEE d", {
                                      locale: es,
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-zinc-400 font-display">
                                    {session.totalCalories || 0} kcal
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                                    <span>F:{session.fatigueLevel || 0}</span>
                                    <span>RIR:{session.rirScore ?? 0}</span>
                                    {session.durationMinutes && (
                                      <span>{session.durationMinutes}min</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
