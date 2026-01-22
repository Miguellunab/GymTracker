/**
 * Servicio de Rutinas y Ejercicios
 * Conecta con las APIs existentes de GymTracker
 */

import { getPrisma } from '../../../src/lib/prisma.js';

const prisma = getPrisma();

/**
 * Obtiene todas las rutinas disponibles
 */
export async function getRoutines() {
  try {
    const routines = await prisma.routine.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { exercises: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    return routines.map(r => ({
      id: r.id,
      name: r.name,
      exerciseCount: r._count.exercises
    }));
  } catch (error) {
    console.error('Error fetching routines:', error);
    return [];
  }
}

/**
 * Obtiene una rutina por nombre con sus ejercicios
 */
export async function getRoutineByName(name) {
  try {
    const routine = await prisma.routine.findFirst({
      where: { name },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!routine) return null;
    
    return {
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises.map(re => ({
        id: re.exercise.id,
        name: re.exercise.name,
        muscleGroup: re.exercise.muscleGroup,
        order: re.order
      }))
    };
  } catch (error) {
    console.error('Error fetching routine by name:', error);
    return null;
  }
}

/**
 * Obtiene una rutina por ID con sus ejercicios
 */
export async function getRoutineById(id) {
  try {
    const routine = await prisma.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!routine) return null;
    
    return {
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises.map(re => ({
        id: re.exercise.id,
        name: re.exercise.name,
        muscleGroup: re.exercise.muscleGroup,
        order: re.order
      }))
    };
  } catch (error) {
    console.error('Error fetching routine by id:', error);
    return null;
  }
}

/**
 * Obtiene todos los ejercicios
 */
export async function getAllExercises() {
  try {
    const exercises = await prisma.exercise.findMany({
      orderBy: [
        { muscleGroup: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return exercises;
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }
}

/**
 * Busca ejercicios por nombre (para parsing de texto libre)
 */
export async function findExerciseByName(name) {
  try {
    // Búsqueda exacta primero
    let exercise = await prisma.exercise.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' }
      }
    });
    
    if (exercise) return exercise;
    
    // Búsqueda parcial
    exercise = await prisma.exercise.findFirst({
      where: { 
        name: { contains: name, mode: 'insensitive' }
      }
    });
    
    return exercise;
  } catch (error) {
    console.error('Error finding exercise:', error);
    return null;
  }
}

export default {
  getRoutines,
  getRoutineByName,
  getRoutineById,
  getAllExercises,
  findExerciseByName,
};
