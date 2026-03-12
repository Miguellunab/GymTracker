/**
 * Gestión de estado conversacional
 * Almacena el estado de cada usuario en memoria
 */

import { STATES } from './constants.js';

const userStates = new Map();

function createDefaultState() {
  return {
    state: STATES.IDLE,
    data: {},
    lastActivity: Date.now(),
  };
}

export function getState(chatId) {
  if (!userStates.has(chatId)) {
    userStates.set(chatId, createDefaultState());
  }
  return userStates.get(chatId);
}

export function setState(chatId, newState, data = null) {
  const current = getState(chatId);
  current.state = newState;
  current.lastActivity = Date.now();
  if (data !== null) {
    current.data = { ...current.data, ...data };
  }
  userStates.set(chatId, current);
  return current;
}

export function clearState(chatId) {
  userStates.set(chatId, createDefaultState());
}

export function updateData(chatId, data) {
  const current = getState(chatId);
  current.data = { ...current.data, ...data };
  current.lastActivity = Date.now();
  userStates.set(chatId, current);
  return current;
}

/**
 * Guarda el workout parseado por IA para confirmación
 */
export function setParsedWorkout(chatId, parsedData) {
  return setState(chatId, STATES.WORKOUT_CONFIRM, {
    parsedWorkout: parsedData,
  });
}

/**
 * Obtiene el workout parseado
 */
export function getParsedWorkout(chatId) {
  const state = getState(chatId);
  return state.data.parsedWorkout || null;
}

export function setWorkoutAmbiguity(chatId, ambiguityData) {
  return setState(chatId, STATES.WORKOUT_AMBIGUITY, {
    workoutAmbiguity: ambiguityData,
  });
}

export function getWorkoutAmbiguity(chatId) {
  const state = getState(chatId);
  return state.data.workoutAmbiguity || null;
}

export default {
  getState,
  setState,
  clearState,
  updateData,
  setParsedWorkout,
  getParsedWorkout,
  setWorkoutAmbiguity,
  getWorkoutAmbiguity,
};
