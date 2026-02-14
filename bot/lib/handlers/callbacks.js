/**
 * Handler de Callbacks (Botones Inline)
 * Simplified: workout confirm/cancel, calendar nav, coach analyze, cancel
 */

import {
  sendMessage,
  editMessage,
  editMessageWithInlineKeyboard,
  answerCallbackQuery,
  sendChatAction,
  sendMessageWithKeyboard
} from '../telegram.js';
import { MESSAGES, STATES, CALLBACKS, EMOJI } from '../constants.js';
import { getState, clearState, getParsedWorkout, updateData } from '../state.js';
import { getCalendarNavKeyboard, getPostWorkoutKeyboard } from '../keyboards/inline.js';
import { getMainKeyboard } from '../keyboards/main.js';

// Services
import { createWorkout } from '../services/workout.js';
import { handleCalendar } from './commands.js';
import { analyzeWorkout } from '../services/coach.js';

/**
 * Handler principal de callbacks
 */
export async function handleCallback(chatId, messageId, callbackData, callbackQueryId) {
  // Responder al callback para quitar el loading
  await answerCallbackQuery(callbackQueryId);

  // Cancelar genérico
  if (callbackData === CALLBACKS.CANCEL || callbackData === 'cancel') {
    clearState(chatId);
    await editMessage(chatId, messageId, MESSAGES.OPERATION_CANCELLED);
    return;
  }

  // Noop (botones informativos)
  if (callbackData === 'noop') {
    return;
  }

  // Confirmar workout parseado
  if (callbackData === CALLBACKS.WORKOUT_CONFIRM) {
    return handleWorkoutConfirm(chatId, messageId);
  }

  // Cancelar workout
  if (callbackData === CALLBACKS.WORKOUT_CANCEL) {
    clearState(chatId);
    await editMessage(chatId, messageId, 'Workout cancelado.');
    return;
  }

  // Navegación calendario
  if (callbackData.startsWith('cal_prev_') || callbackData.startsWith('cal_next_')) {
    return handleCalendarNav(chatId, messageId, callbackData);
  }

  if (callbackData === 'calendar_today') {
    const now = new Date();
    return handleCalendarNav(chatId, messageId, `cal_now_${now.getMonth()}_${now.getFullYear()}`);
  }

  // Coach analyze post workout
  if (callbackData === CALLBACKS.COACH_ANALYZE) {
    return handleCoachAnalyze(chatId, messageId);
  }
}

/**
 * Confirmar y guardar workout parseado por IA
 */
async function handleWorkoutConfirm(chatId, messageId) {
  const parsed = getParsedWorkout(chatId);

  if (!parsed) {
    await editMessage(chatId, messageId, 'Error: No hay datos del workout.');
    return;
  }

  await sendChatAction(chatId, 'typing');

  try {
    // Save workout using the new createWorkout service
    const workout = await createWorkout({
      muscleGroup: parsed.muscleGroup || 'Sin especificar',
      date: new Date(),
      durationMinutes: parsed.durationMinutes || null,
      totalCalories: parsed.totalCalories || null,
      didCardio: parsed.didCardio || false,
      cardioType: parsed.cardioType || null,
      cardioMinutes: parsed.cardioMinutes || null,
      fatigueLevel: parsed.fatigueLevel || null,
      nitRating: parsed.nitRating || null,
      feeling: parsed.feeling || null,
      notes: parsed.notes || null,
      exercises: parsed.exercises || [],
    });

    // Store parsed data for coach analyze
    updateData(chatId, { lastParsedWorkout: parsed });
    clearState(chatId);

    // Build summary
    let summary = `${EMOJI.WORKOUT} *${parsed.muscleGroup || 'Entrenamiento'}*\n`;

    if (parsed.exercises && parsed.exercises.length > 0) {
      for (const ex of parsed.exercises) {
        summary += `  _${ex.name}: ${ex.weight}kg ${ex.sets}x${ex.reps}_\n`;
      }
    }

    if (parsed.durationMinutes) {
      summary += `⏱️ ${parsed.durationMinutes} min\n`;
    }
    if (parsed.totalCalories) {
      summary += `🔥 ~${parsed.totalCalories} kcal\n`;
    }
    if (parsed.fatigueLevel) {
      summary += `😓 Fatiga: ${parsed.fatigueLevel}/10\n`;
    }
    if (parsed.nitRating) {
      summary += `⭐ NIT: ${parsed.nitRating}/10\n`;
    }
    if (parsed.didCardio) {
      summary += `${EMOJI.CARDIO} Cardio: ${parsed.cardioType || 'Sí'} ${parsed.cardioMinutes || ''}min\n`;
    }

    const successMsg = MESSAGES.WORKOUT_SAVED(summary);

    await editMessageWithInlineKeyboard(
      chatId,
      messageId,
      successMsg,
      getPostWorkoutKeyboard()
    );

  } catch (error) {
    console.error('Error saving workout:', error);
    await editMessage(chatId, messageId, `${MESSAGES.ERROR}\n\n${error.message}`);
  }
}

/**
 * Navegación del calendario
 */
async function handleCalendarNav(chatId, messageId, callbackData) {
  let month, year;

  if (callbackData.startsWith('cal_prev_')) {
    const parts = callbackData.replace('cal_prev_', '').split('_');
    month = parseInt(parts[0]) - 1;
    year = parseInt(parts[1]);
    if (month < 0) {
      month = 11;
      year--;
    }
  } else if (callbackData.startsWith('cal_next_')) {
    const parts = callbackData.replace('cal_next_', '').split('_');
    month = parseInt(parts[0]) + 1;
    year = parseInt(parts[1]);
    if (month > 11) {
      month = 0;
      year++;
    }
  } else {
    const now = new Date();
    month = now.getMonth();
    year = now.getFullYear();
  }

  const { getMonthCalendar, formatCalendarText } = await import('../services/calendar.js');
  const calendar = await getMonthCalendar(year, month);

  if (calendar) {
    const text = formatCalendarText(calendar);
    await editMessageWithInlineKeyboard(
      chatId,
      messageId,
      text,
      getCalendarNavKeyboard(month, year)
    );
  }
}

/**
 * Análisis del coach post-workout
 */
async function handleCoachAnalyze(chatId, messageId) {
  await sendChatAction(chatId, 'typing');

  const state = getState(chatId);
  const lastWorkout = state.data.lastParsedWorkout;

  if (!lastWorkout) {
    await sendMessage(chatId, 'No hay workout reciente para analizar.');
    return;
  }

  const analysis = await analyzeWorkout({
    muscleGroup: lastWorkout.muscleGroup,
    exercises: lastWorkout.exercises,
    durationMinutes: lastWorkout.durationMinutes,
    totalCalories: lastWorkout.totalCalories,
    didCardio: lastWorkout.didCardio,
    cardioMinutes: lastWorkout.cardioMinutes,
    cardioType: lastWorkout.cardioType,
  });

  await sendMessage(chatId, `${EMOJI.COACH} *Análisis del Coach:*\n\n${analysis}`);
}

export default {
  handleCallback,
};
