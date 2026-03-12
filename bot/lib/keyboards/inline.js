/**
 * Teclados Inline (botones dentro de mensajes)
 */

import { EMOJI, CALLBACKS } from '../constants.js';

/**
 * Confirmación de workout parseado
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

export function getWorkoutAmbiguityKeyboard(options = []) {
  const rows = options
    .filter((option) => option.slug !== 'other')
    .map((option) => ([{ text: option.canonicalName, callback_data: `workout_ambiguity_${option.slug}` }]));

  rows.push([{ text: 'Otro', callback_data: 'workout_ambiguity_other' }]);
  rows.push([{ text: '❌ Cancelar', callback_data: CALLBACKS.WORKOUT_CANCEL }]);

  return rows;
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

export default {
  getWorkoutConfirmKeyboard,
  getWorkoutAmbiguityKeyboard,
  getCalendarNavKeyboard,
  getPostWorkoutKeyboard,
  getCancelKeyboard,
  getExitCoachKeyboard,
};
