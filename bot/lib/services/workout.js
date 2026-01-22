/**
 * Servicio de Workouts
 * Crear, leer y gestionar sesiones de entrenamiento
 */

import { getPrisma } from '../../../src/lib/prisma.js';

const prisma = getPrisma();

/**
 * Crea una nueva sesión de entrenamiento
 */
export async function createWorkout(data) {
  try {
    const {
      routineName,
      date,
      durationSeconds,
      totalCalories,
      didCardio,
      cardioMinutes,
      cardioIntensity,
      notes,
      workoutData, // { exerciseId: [{ weight, reps, isWarmup }] }
    } = data;
    
    // Preparar los sets
    const sets = [];
    for (const [exerciseId, exerciseSets] of Object.entries(workoutData || {})) {
      for (const set of exerciseSets) {
        sets.push({
          exerciseId,
          weight: set.weight,
          reps: set.reps,
          isWarmup: set.isWarmup || false,
          rpe: set.rpe || null,
          restTimeUsed: set.restTimeUsed || null,
        });
      }
    }
    
    const workout = await prisma.workoutSession.create({
      data: {
        routineName,
        date: date ? new Date(date) : new Date(),
        durationSeconds,
        totalCalories,
        didCardio: didCardio || false,
        cardioMinutes,
        cardioIntensity,
        notes,
        sets: {
          create: sets
        }
      },
      include: {
        sets: {
          include: {
            exercise: true
          }
        }
      }
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
      include: {
        sets: {
          include: {
            exercise: true
          }
        }
      }
    });
    
    return workouts.map(w => ({
      id: w.id,
      date: w.date,
      routineName: w.routineName,
      durationSeconds: w.durationSeconds,
      totalCalories: w.totalCalories,
      didCardio: w.didCardio,
      cardioMinutes: w.cardioMinutes,
      cardioIntensity: w.cardioIntensity,
      notes: w.notes,
      sets: w.sets.map(s => ({
        exercise: s.exercise.name,
        weight: s.weight,
        reps: s.reps,
        isWarmup: s.isWarmup
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
    
    const workout = await prisma.workoutSession.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        sets: {
          include: {
            exercise: true
          }
        }
      }
    });
    
    return workout;
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
    // Verificar si ya existe un registro para ese día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existing = await prisma.workoutSession.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    if (existing) {
      // Actualizar a descanso
      return await prisma.workoutSession.update({
        where: { id: existing.id },
        data: { routineName: 'Descanso' }
      });
    }
    
    // Crear nuevo registro de descanso
    return await prisma.workoutSession.create({
      data: {
        routineName: 'Descanso',
        date: startOfDay,
        durationSeconds: 0,
        totalCalories: 0
      }
    });
  } catch (error) {
    console.error('Error marking rest day:', error);
    throw error;
  }
}

/**
 * Elimina el workout de una fecha
 */
export async function deleteWorkoutByDate(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const workout = await prisma.workoutSession.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    if (workout) {
      // Eliminar sets primero
      await prisma.workoutSet.deleteMany({
        where: { workoutSessionId: workout.id }
      });
      
      // Eliminar sesión
      await prisma.workoutSession.delete({
        where: { id: workout.id }
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
}

/**
 * Calcula estadísticas del workout
 */
export function calculateWorkoutStats(workoutData, cardio) {
  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  
  for (const exerciseSets of Object.values(workoutData)) {
    for (const set of exerciseSets) {
      if (!set.isWarmup) {
        totalSets++;
        totalReps += set.reps;
        totalWeight += set.weight * set.reps;
      }
    }
  }
  
  // Estimación básica de duración (2 min por serie + descanso)
  const estimatedSeconds = totalSets * 180; // 3 min por serie en promedio
  
  // Estimación de calorías (muy básica)
  // ~5-7 kcal por serie de fuerza + cardio
  let calories = totalSets * 6;
  if (cardio.did) {
    const cardioCalPerMin = cardio.intensity === 'Alta' ? 12 : cardio.intensity === 'Media' ? 9 : 6;
    calories += cardio.minutes * cardioCalPerMin;
  }
  
  return {
    totalSets,
    totalReps,
    totalVolume: totalWeight, // kg totales levantados
    estimatedDuration: estimatedSeconds,
    estimatedCalories: Math.round(calories)
  };
}

export default {
  createWorkout,
  getRecentWorkouts,
  getTodayWorkout,
  markRestDay,
  deleteWorkoutByDate,
  calculateWorkoutStats,
};
