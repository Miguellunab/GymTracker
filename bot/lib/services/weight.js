/**
 * Servicio de Peso Corporal
 */

import { getPrisma } from '../../../src/lib/prisma.js';

const prisma = getPrisma();

/**
 * Registra un nuevo peso
 */
export async function logWeight(weight) {
  try {
    const entry = await prisma.weightLog.create({
      data: {
        weight: parseFloat(weight),
        date: new Date()
      }
    });
    
    return entry;
  } catch (error) {
    console.error('Error logging weight:', error);
    throw error;
  }
}

/**
 * Obtiene el último peso registrado
 */
export async function getLastWeight() {
  try {
    const last = await prisma.weightLog.findFirst({
      orderBy: { date: 'desc' }
    });
    
    return last;
  } catch (error) {
    console.error('Error fetching last weight:', error);
    return null;
  }
}

/**
 * Obtiene el historial de peso
 */
export async function getWeightHistory(limit = 10) {
  try {
    const history = await prisma.weightLog.findMany({
      take: limit,
      orderBy: { date: 'desc' }
    });
    
    return history;
  } catch (error) {
    console.error('Error fetching weight history:', error);
    return [];
  }
}

/**
 * Calcula la diferencia con el último peso
 */
export async function getWeightDiff(newWeight) {
  const last = await getLastWeight();
  if (!last) return null;
  return parseFloat(newWeight) - last.weight;
}

export default {
  logWeight,
  getLastWeight,
  getWeightHistory,
  getWeightDiff,
};
