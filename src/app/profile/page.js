"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Scale,
  Plus,
  Trophy,
  TrendingUp,
  Calendar,
  Dumbbell,
  Flame,
} from "lucide-react";

export default function ProfilePage() {
  const [weights, setWeights] = useState([]);
  const [newWeight, setNewWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [stats, setStats] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [weightRes, sessionRes] = await Promise.all([
        fetch("/api/weight"),
        fetch("/api/workouts?limit=200"),
      ]);

      if (weightRes.ok) {
        const wData = await weightRes.json();
        setWeights(Array.isArray(wData) ? wData : []);
      }

      if (sessionRes.ok) {
        const sessions = await sessionRes.json();
        if (Array.isArray(sessions)) {
          // Calculate stats
          const totalSessions = sessions.length;
          const totalCalories = sessions.reduce(
            (sum, s) => sum + (s.totalCalories || 0),
            0
          );
          const avgDuration =
            sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) /
              totalSessions || 0;

          setStats({
            totalSessions,
            totalCalories: Math.round(totalCalories),
            avgDuration: Math.round(avgDuration),
          });

          // Calculate PRs from all sets
          const prMap = {};
          sessions.forEach((s) => {
            if (s.sets) {
              s.sets.forEach((set) => {
                const name = set.exerciseName;
                if (!name) return;
                const current = prMap[name] || 0;
                if (set.weight > current) {
                  prMap[name] = set.weight;
                }
              });
            }
          });

          const prList = Object.entries(prMap)
            .map(([exercise, weight]) => ({ exercise, weight }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 15);

          setPrs(prList);
        }
      }
    } catch (e) {
      console.error("Profile data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w || w < 20 || w > 300 || savingWeight) return;

    setSavingWeight(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: w }),
      });
      if (res.ok) {
        setNewWeight("");
        fetchData();
      }
    } catch (e) {
      console.error("Save weight error:", e);
    } finally {
      setSavingWeight(false);
    }
  };

  // Simple weight graph (last 10 entries)
  const graphWeights = weights.slice(0, 10).reverse();
  const maxW = Math.max(...graphWeights.map((w) => w.weight), 1);
  const minW = Math.min(...graphWeights.map((w) => w.weight), 0);
  const range = maxW - minW || 1;

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
        <h1 className="text-2xl font-bold font-display">Perfil</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Tu progreso y estadisticas</p>
      </div>

      {/* Weight Tracking */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#2196F3]" />
            <h2 className="text-sm font-semibold">Peso Corporal</h2>
          </div>
          {weights.length > 0 && (
            <span className="text-lg font-bold font-display">
              {weights[0].weight}
              <span className="text-xs font-normal text-zinc-500 ml-1">kg</span>
            </span>
          )}
        </div>

        {/* Weight Graph */}
        {graphWeights.length > 1 && (
          <div className="h-24 flex items-end gap-1">
            {graphWeights.map((w, i) => {
              const height = ((w.weight - minW) / range) * 80 + 20;
              return (
                <motion.div
                  key={w.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-1 rounded-t-md bg-[#2196F3]/20 relative group"
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 hidden group-hover:block text-[9px] text-zinc-400 whitespace-nowrap">
                    {w.weight}kg
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Weight */}
        <div className="flex gap-2">
          <input
            type="number"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="Ej: 75.5"
            className="input-dark flex-1"
            step="0.1"
          />
          <button
            onClick={saveWeight}
            disabled={savingWeight || !newWeight}
            className="px-4 rounded-xl bg-[#2196F3]/15 text-[#2196F3] text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* General Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <Dumbbell className="w-4 h-4 text-[#00C853] mx-auto mb-1.5" />
            <p className="text-xl font-bold font-display">{stats.totalSessions}</p>
            <p className="text-[10px] text-zinc-500">sesiones</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
            <p className="text-xl font-bold font-display">
              {stats.totalCalories > 1000
                ? `${(stats.totalCalories / 1000).toFixed(1)}k`
                : stats.totalCalories}
            </p>
            <p className="text-[10px] text-zinc-500">kcal total</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Calendar className="w-4 h-4 text-[#2196F3] mx-auto mb-1.5" />
            <p className="text-xl font-bold font-display">{stats.avgDuration}</p>
            <p className="text-[10px] text-zinc-500">min prom</p>
          </div>
        </div>
      )}

      {/* Personal Records */}
      {prs.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold">Records Personales</h2>
          </div>
          <div className="space-y-2">
            {prs.map((pr, i) => (
              <div
                key={pr.exercise}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 w-5">{i + 1}.</span>
                  <span className="text-sm">{pr.exercise}</span>
                </div>
                <span className="text-sm font-bold font-display text-[#00C853]">
                  {pr.weight} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weight History */}
      {weights.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold">Historial de Peso</h2>
          </div>
          <div className="space-y-1.5">
            {weights.slice(0, 10).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between py-1 text-sm"
              >
                <span className="text-zinc-500">
                  {format(new Date(w.date), "d MMM yyyy", { locale: es })}
                </span>
                <span className="font-display font-medium">{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
