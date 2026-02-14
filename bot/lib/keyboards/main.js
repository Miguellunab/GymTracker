/**
 * Teclado principal permanente (Reply Keyboard)
 */

import { EMOJI } from '../constants.js';

/**
 * Teclado principal (sin timer)
 */
export function getMainKeyboard() {
  return [
    [
      { text: `${EMOJI.WORKOUT} Workout` },
      { text: `${EMOJI.HISTORY} Historial` },
    ],
    [
      { text: `${EMOJI.WEIGHT} Peso` },
      { text: `${EMOJI.COACH} Coach AI` },
    ],
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
