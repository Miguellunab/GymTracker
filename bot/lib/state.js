/**
 * Gestión de estado conversacional
 * Almacena el estado de cada usuario en memoria (para Vercel serverless, considerar Redis en producción)
 */

import { STATES } from './constants.js';

// Estado en memoria (se reinicia en cada cold start de serverless)
// Para producción real, usar Redis/Upstash
const userStates = new Map();

/**
 * Estructura del estado de usuario
 */
function createDefaultState() {
  return {
    state: STATES.IDLE,
    data: {},
    timer: null,
    timerMessageId: null,
    lastActivity: Date.now(),
  };
}

/**
 * Obtiene el estado de un usuario
 */
export function getState(chatId) {
  if (!userStates.has(chatId)) {
    userStates.set(chatId, createDefaultState());
  }
  return userStates.get(chatId);
}

/**
 * Actualiza el estado de un usuario
 */
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

/**
 * Limpia el estado de un usuario (vuelve a IDLE)
 */
export function clearState(chatId) {
  const current = getState(chatId);
  // Cancelar timer si existe
  if (current.timer) {
    clearTimeout(current.timer);
  }
  userStates.set(chatId, createDefaultState());
}

/**
 * Actualiza solo los datos sin cambiar el estado
 */
export function updateData(chatId, data) {
  const current = getState(chatId);
  current.data = { ...current.data, ...data };
  current.lastActivity = Date.now();
  userStates.set(chatId, current);
  return current;
}

/**
 * Guarda referencia al timer activo
 */
export function setTimerRef(chatId, timerRef, messageId) {
  const current = getState(chatId);
  current.timer = timerRef;
  current.timerMessageId = messageId;
  userStates.set(chatId, current);
}

/**
 * Obtiene la referencia al timer
 */
export function getTimerRef(chatId) {
  const current = getState(chatId);
  return {
    timer: current.timer,
    messageId: current.timerMessageId,
  };
}

/**
 * Limpia el timer
 */
export function clearTimer(chatId) {
  const current = getState(chatId);
  if (current.timer) {
    clearTimeout(current.timer);
    current.timer = null;
    current.timerMessageId = null;
  }
  userStates.set(chatId, current);
}

/**
 * Verifica si hay un timer activo
 */
export function hasActiveTimer(chatId) {
  const current = getState(chatId);
  return current.timer !== null;
}

// ============ Workout State Helpers ============

/**
 * Inicializa el estado del workout
 */
export function initWorkoutState(chatId) {
  return setState(chatId, STATES.WORKOUT_SELECT_ROUTINE, {
    workout: {
      routineName: null,
      selectedExercises: [],
      exerciseData: {}, // { exerciseId: { name, sets: [{weight, reps}] } }
      cardio: {
        did: false,
        minutes: 0,
        intensity: null,
      },
    },
  });
}

/**
 * Obtiene el estado del workout actual
 */
export function getWorkoutData(chatId) {
  const state = getState(chatId);
  return state.data.workout || null;
}

/**
 * Actualiza datos del workout
 */
export function updateWorkoutData(chatId, workoutData) {
  const state = getState(chatId);
  state.data.workout = { ...state.data.workout, ...workoutData };
  userStates.set(chatId, state);
  return state.data.workout;
}

/**
 * Toggle selección de ejercicio
 */
export function toggleExercise(chatId, exerciseId, exerciseName) {
  const state = getState(chatId);
  const workout = state.data.workout;
  
  const index = workout.selectedExercises.findIndex(e => e.id === exerciseId);
  
  if (index > -1) {
    // Remover
    workout.selectedExercises.splice(index, 1);
    delete workout.exerciseData[exerciseId];
  } else {
    // Agregar
    workout.selectedExercises.push({ id: exerciseId, name: exerciseName });
    workout.exerciseData[exerciseId] = { name: exerciseName, sets: [] };
  }
  
  userStates.set(chatId, state);
  return workout.selectedExercises;
}

/**
 * Agrega una serie a un ejercicio
 */
export function addSetToExercise(chatId, exerciseId, weight, reps) {
  const state = getState(chatId);
  const workout = state.data.workout;
  
  if (!workout.exerciseData[exerciseId]) {
    workout.exerciseData[exerciseId] = { name: '', sets: [] };
  }
  
  workout.exerciseData[exerciseId].sets.push({ weight, reps });
  userStates.set(chatId, state);
  
  return workout.exerciseData[exerciseId].sets;
}

/**
 * Guarda el índice del ejercicio actual en el flujo de input
 */
export function setCurrentExerciseIndex(chatId, index) {
  updateData(chatId, { currentExerciseIndex: index, currentSetInput: { weight: 0, reps: 0 } });
}

/**
 * Obtiene el ejercicio actual en el flujo
 */
export function getCurrentExercise(chatId) {
  const state = getState(chatId);
  const workout = state.data.workout;
  const index = state.data.currentExerciseIndex || 0;
  
  if (workout && workout.selectedExercises[index]) {
    return {
      ...workout.selectedExercises[index],
      index,
      setsCount: workout.exerciseData[workout.selectedExercises[index].id]?.sets?.length || 0,
    };
  }
  return null;
}

// ============ Parsed Workout (Text Libre) ============

/**
 * Guarda el workout parseado por IA para confirmación
 */
export function setParsedWorkout(chatId, parsedData) {
  return setState(chatId, STATES.WORKOUT_TEXT_CONFIRM, {
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

export default {
  getState,
  setState,
  clearState,
  updateData,
  setTimerRef,
  getTimerRef,
  clearTimer,
  hasActiveTimer,
  initWorkoutState,
  getWorkoutData,
  updateWorkoutData,
  toggleExercise,
  addSetToExercise,
  setCurrentExerciseIndex,
  getCurrentExercise,
  setParsedWorkout,
  getParsedWorkout,
};
