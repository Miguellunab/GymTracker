/**
 * Servicio de Peso Corporal
 */

import prisma from '../../../src/lib/prisma.js';

/**
 * Registra un nuevo peso
 */
export async function logWeight(weight) {
  try {
    return await prisma.weightLog.create({
      data: {
        weight: parseFloat(weight),
        date: new Date()
      }
    });
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
    return await prisma.weightLog.findFirst({
      orderBy: { date: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching last weight:', error);
    return null;
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
  getWeightDiff,
};
