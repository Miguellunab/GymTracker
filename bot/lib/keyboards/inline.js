/**
 * Teclados Inline (botones dentro de mensajes)
 */

import { EMOJI, CALLBACKS, CARDIO_INTENSITIES, CARDIO_MINUTES_OPTIONS } from '../constants.js';

/**
 * Botones del timer (para mensajes)
 */
export function getTimerInlineKeyboard() {
  return [
    [
      { text: `${EMOJI.TIMER} 3min`, callback_data: CALLBACKS.TIMER_3 },
      { text: `${EMOJI.TIMER} 4min`, callback_data: CALLBACKS.TIMER_4 },
      { text: `${EMOJI.TIMER} 5min`, callback_data: CALLBACKS.TIMER_5 },
    ],
    [
      { text: 'Custom', callback_data: CALLBACKS.TIMER_CUSTOM },
      { text: 'Cancelar', callback_data: CALLBACKS.TIMER_CANCEL },
    ],
  ];
}

/**
 * Botón para cancelar timer activo
 */
export function getTimerCancelKeyboard() {
  return [
    [{ text: '❌ Cancelar Timer', callback_data: CALLBACKS.TIMER_CANCEL }],
  ];
}

/**
 * Selector de rutinas
 */
export function getRoutineKeyboard(routines) {
  const keyboard = [];
  
  // Rutinas en filas de 1 (nombres largos)
  for (const routine of routines) {
    keyboard.push([
      { text: routine.name, callback_data: `${CALLBACKS.ROUTINE_SELECT}${routine.id}` },
    ]);
  }
  
  // Opción de descanso
  keyboard.push([
    { text: `${EMOJI.REST} Descanso`, callback_data: `${CALLBACKS.ROUTINE_SELECT}rest` },
  ]);
  
  // Cancelar
  keyboard.push([
    { text: '❌ Cancelar', callback_data: CALLBACKS.CANCEL },
  ]);
  
  return keyboard;
}

/**
 * Selector de ejercicios (checkboxes)
 */
export function getExerciseKeyboard(exercises, selectedIds) {
  const keyboard = [];
  
  // Ejercicios en filas de 1 (nombres largos)
  for (const exercise of exercises) {
    const isSelected = selectedIds.includes(exercise.id);
    const emoji = isSelected ? EMOJI.CHECK : EMOJI.UNCHECK;
    keyboard.push([
      { 
        text: `${emoji} ${exercise.name}`, 
        callback_data: `${CALLBACKS.EXERCISE_TOGGLE}${exercise.id}` 
      },
    ]);
  }
  
  // Botones de acción
  keyboard.push([
    { text: '✓ Continuar', callback_data: CALLBACKS.EXERCISE_DONE },
    { text: '❌ Cancelar', callback_data: CALLBACKS.CANCEL },
  ]);
  
  return keyboard;
}

/**
 * Input de series (peso/reps con controles)
 */
export function getSetInputKeyboard(currentWeight, currentReps, setNumber, currentRir = null) {
  return [
    // Controles de peso
    [
      { text: '-5', callback_data: 'set_w_-5' },
      { text: '-2.5', callback_data: 'set_w_-2.5' },
      { text: `${currentWeight} kg`, callback_data: 'noop' },
      { text: '+2.5', callback_data: 'set_w_+2.5' },
      { text: '+5', callback_data: 'set_w_+5' },
    ],
    // Controles de reps
    [
      { text: '-2', callback_data: 'set_r_-2' },
      { text: '-1', callback_data: 'set_r_-1' },
      { text: `${currentReps} reps`, callback_data: 'noop' },
      { text: '+1', callback_data: 'set_r_+1' },
      { text: '+2', callback_data: 'set_r_+2' },
    ],
    // Reps rápidos
    [
      { text: '6', callback_data: 'set_reps_6' },
      { text: '8', callback_data: 'set_reps_8' },
      { text: '10', callback_data: 'set_reps_10' },
      { text: '12', callback_data: 'set_reps_12' },
      { text: '15', callback_data: 'set_reps_15' },
    ],
    // RIR (Reps In Reserve)
    [
      { text: `RIR: ${currentRir !== null ? currentRir : '-'}`, callback_data: 'noop' },
      { text: '0', callback_data: 'set_rir_0' },
      { text: '1', callback_data: 'set_rir_1' },
      { text: '2', callback_data: 'set_rir_2' },
      { text: '3', callback_data: 'set_rir_3' },
    ],
    // Acciones
    [
      { text: `✓ Guardar Serie ${setNumber}`, callback_data: CALLBACKS.SET_ADD },
    ],
    [
      { text: '→ Siguiente Ejercicio', callback_data: CALLBACKS.SET_DONE },
      { text: '❌ Cancelar', callback_data: CALLBACKS.CANCEL },
    ],
  ];
}

/**
 * Pregunta de cardio (Sí/No)
 */
export function getCardioQuestionKeyboard() {
  return [
    [
      { text: `${EMOJI.CARDIO} Sí`, callback_data: CALLBACKS.CARDIO_YES },
      { text: 'No', callback_data: CALLBACKS.CARDIO_NO },
    ],
  ];
}

/**
 * Selector de minutos de cardio
 */
export function getCardioMinutesKeyboard() {
  const buttons = CARDIO_MINUTES_OPTIONS.map(min => ({
    text: `${min} min`,
    callback_data: `${CALLBACKS.CARDIO_MINUTES}${min}`,
  }));
  
  return [
    buttons.slice(0, 3),
    buttons.slice(3),
    [{ text: '❌ Cancelar', callback_data: CALLBACKS.CANCEL }],
  ];
}

/**
 * Selector de intensidad de cardio
 */
export function getCardioIntensityKeyboard() {
  return [
    CARDIO_INTENSITIES.map(intensity => ({
      text: intensity,
      callback_data: `${CALLBACKS.CARDIO_INTENSITY}${intensity}`,
    })),
  ];
}

/**
 * Selector de duración del entrenamiento
 */
export function getDurationKeyboard() {
  return [
    [
      { text: '30 min', callback_data: 'duration_min_30' },
      { text: '45 min', callback_data: 'duration_min_45' },
      { text: '60 min', callback_data: 'duration_min_60' },
    ],
    [
      { text: '75 min', callback_data: 'duration_min_75' },
      { text: '90 min', callback_data: 'duration_min_90' },
      { text: '120 min', callback_data: 'duration_min_120' },
    ],
  ];
}

/**
 * Confirmación de workout
 */
export function getWorkoutConfirmKeyboard() {
  return [
    [
      { text: '✓ Guardar Workout', callback_data: CALLBACKS.WORKOUT_CONFIRM },
    ],
    [
      { text: '❌ Cancelar', callback_data: CALLBACKS.WORKOUT_CANCEL },
    ],
  ];
}

/**
 * Confirmación de workout parseado (texto libre)
 */
export function getTextWorkoutConfirmKeyboard() {
  return [
    [
      { text: '✓ Confirmar', callback_data: CALLBACKS.TEXT_CONFIRM },
      { text: '✏️ Editar', callback_data: CALLBACKS.TEXT_EDIT },
    ],
    [
      { text: '❌ Cancelar', callback_data: CALLBACKS.CANCEL },
    ],
  ];
}

/**
 * Ver análisis del coach después de guardar
 */
export function getPostWorkoutKeyboard() {
  return [
    [
      { text: `${EMOJI.COACH} Ver análisis del Coach`, callback_data: CALLBACKS.COACH_ANALYZE },
    ],
  ];
}

/**
 * Navegación de calendario
 */
export function getCalendarNavKeyboard(month, year) {
  return [
    [
      { text: '← Anterior', callback_data: `${CALLBACKS.CALENDAR_PREV}${month}_${year}` },
      { text: 'Hoy', callback_data: 'calendar_today' },
      { text: 'Siguiente →', callback_data: `${CALLBACKS.CALENDAR_NEXT}${month}_${year}` },
    ],
  ];
}

/**
 * Historial con opciones
 */
export function getHistoryKeyboard(sessions) {
  const keyboard = sessions.slice(0, 5).map(session => ([
    { 
      text: `${session.date} - ${session.routineName}`, 
      callback_data: `${CALLBACKS.HISTORY_DETAIL}${session.id}` 
    },
  ]));
  
  return keyboard;
}

/**
 * Botón genérico de cancelar
 */
export function getCancelKeyboard() {
  return [
    [{ text: '❌ Cancelar', callback_data: CALLBACKS.CANCEL }],
  ];
}

/**
 * Botón de salir del coach
 */
export function getExitCoachKeyboard() {
  return [
    [{ text: '← Salir del Coach', callback_data: CALLBACKS.CANCEL }],
  ];
}

/**
 * Confirmación simple (Sí/No)
 */
export function getYesNoKeyboard(yesCallback, noCallback) {
  return [
    [
      { text: '✓ Sí', callback_data: yesCallback },
      { text: '✗ No', callback_data: noCallback },
    ],
  ];
}

export default {
  getTimerInlineKeyboard,
  getTimerCancelKeyboard,
  getRoutineKeyboard,
  getExerciseKeyboard,
  getSetInputKeyboard,
  getCardioQuestionKeyboard,
  getCardioMinutesKeyboard,
  getCardioIntensityKeyboard,
  getDurationKeyboard,
  getWorkoutConfirmKeyboard,
  getTextWorkoutConfirmKeyboard,
  getPostWorkoutKeyboard,
  getCalendarNavKeyboard,
  getHistoryKeyboard,
  getCancelKeyboard,
  getExitCoachKeyboard,
  getYesNoKeyboard,
};
