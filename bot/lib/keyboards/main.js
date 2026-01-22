/**
 * Teclado principal permanente (Reply Keyboard)
 * Este teclado SIEMPRE está visible en la parte inferior
 */

import { EMOJI } from '../constants.js';

/**
 * Teclado principal con timer y opciones
 */
export function getMainKeyboard() {
  return [
    // Fila 1: Timer buttons (siempre visibles y accesibles)
    [
      { text: `${EMOJI.TIMER} 3min` },
      { text: `${EMOJI.TIMER} 4min` },
      { text: `${EMOJI.TIMER} 5min` },
    ],
    // Fila 2: Workout y Historial
    [
      { text: `${EMOJI.WORKOUT} Workout` },
      { text: `${EMOJI.HISTORY} Historial` },
    ],
    // Fila 3: Peso y Coach
    [
      { text: `${EMOJI.WEIGHT} Peso` },
      { text: `${EMOJI.COACH} Coach AI` },
    ],
    // Fila 4: Calendario y Descanso
    [
      { text: `${EMOJI.CALENDAR} Calendario` },
      { text: `${EMOJI.REST} Descanso` },
    ],
  ];
}

/**
 * Detecta si un texto corresponde a un botón del teclado principal
 */
export function isMainKeyboardAction(text) {
  const actions = {
    [`${EMOJI.TIMER} 3min`]: 'timer_3',
    [`${EMOJI.TIMER} 4min`]: 'timer_4',
    [`${EMOJI.TIMER} 5min`]: 'timer_5',
    [`${EMOJI.WORKOUT} Workout`]: 'workout',
    [`${EMOJI.HISTORY} Historial`]: 'history',
    [`${EMOJI.WEIGHT} Peso`]: 'weight',
    [`${EMOJI.COACH} Coach AI`]: 'coach',
    [`${EMOJI.CALENDAR} Calendario`]: 'calendar',
    [`${EMOJI.REST} Descanso`]: 'rest',
  };
  
  return actions[text] || null;
}

export default {
  getMainKeyboard,
  isMainKeyboardAction,
};
