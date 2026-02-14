/**
 * Servicio de Workouts
 * Crear, leer y gestionar sesiones de entrenamiento (nuevo schema)
 */

import prisma from '../../../src/lib/prisma.js';

/**
 * Crea una nueva sesión de entrenamiento
 */
export async function createWorkout(data) {
  try {
    const {
      muscleGroup,
      date,
      durationMinutes,
      totalCalories,
      didCardio,
      cardioType,
      cardioMinutes,
      fatigueLevel,
      nitRating,
      feeling,
      notes,
      exercises, // [{ name, weight, sets, reps }]
    } = data;

    const sets = (exercises || []).map(ex => ({
      exerciseName: ex.name,
      weight: ex.weight || 0,
      sets: ex.sets || 3,
      reps: ex.reps || 10,
    }));

    const workout = await prisma.workoutSession.create({
      data: {
        muscleGroup: muscleGroup || 'Sin especificar',
        date: date ? new Date(date) : new Date(),
        durationMinutes: durationMinutes || null,
        totalCalories: totalCalories || null,
        didCardio: didCardio || false,
        cardioType: cardioType || null,
        cardioMinutes: cardioMinutes || null,
        fatigueLevel: fatigueLevel || null,
        nitRating: nitRating || null,
        feeling: feeling || null,
        notes: notes || null,
        sets: {
          create: sets
        }
      },
      include: { sets: true }
    });

    return workout;
  } catch (error) {
    console.error('Error creating workout:', error);
    throw error;
  }
}

/**
 * Obtiene los últimos entrenamientos
 */
export async function getRecentWorkouts(limit = 7) {
  try {
    const workouts = await prisma.workoutSession.findMany({
      take: limit,
      orderBy: { date: 'desc' },
      include: { sets: true }
    });

    return workouts.map(w => ({
      id: w.id,
      date: w.date,
      muscleGroup: w.muscleGroup,
      durationMinutes: w.durationMinutes,
      totalCalories: w.totalCalories,
      didCardio: w.didCardio,
      cardioType: w.cardioType,
      cardioMinutes: w.cardioMinutes,
      fatigueLevel: w.fatigueLevel,
      nitRating: w.nitRating,
      feeling: w.feeling,
      notes: w.notes,
      sets: w.sets.map(s => ({
        exercise: s.exerciseName,
        weight: s.weight,
        sets: s.sets,
        reps: s.reps,
      }))
    }));
  } catch (error) {
    console.error('Error fetching recent workouts:', error);
    return [];
  }
}

/**
 * Obtiene el workout de hoy (si existe)
 */
export async function getTodayWorkout() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.workoutSession.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
      include: { sets: true }
    });
  } catch (error) {
    console.error('Error fetching today workout:', error);
    return null;
  }
}

/**
 * Marca un día como descanso
 */
export async function markRestDay(date = new Date()) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.workoutSession.findFirst({
      where: { date: { gte: startOfDay, lte: endOfDay } }
    });

    if (existing) {
      return await prisma.workoutSession.update({
        where: { id: existing.id },
        data: { muscleGroup: 'Descanso' }
      });
    }

    return await prisma.workoutSession.create({
      data: {
        muscleGroup: 'Descanso',
        date: startOfDay,
        durationMinutes: 0,
        totalCalories: 0
      }
    });
  } catch (error) {
    console.error('Error marking rest day:', error);
    throw error;
  }
}

/**
 * Calcula estadísticas simples de un workout parseado
 */
export function calculateWorkoutStats(exercises, cardio) {
  let totalSets = 0;
  let totalReps = 0;

  for (const ex of exercises || []) {
    totalSets += ex.sets || 0;
    totalReps += (ex.sets || 0) * (ex.reps || 0);
  }

  return { totalSets, totalReps };
}

export default {
  createWorkout,
  getRecentWorkouts,
  getTodayWorkout,
  markRestDay,
  calculateWorkoutStats,
};
