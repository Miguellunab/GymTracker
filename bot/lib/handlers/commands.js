/**
 * Handler de Comandos
 * /start, /help, /workout, /peso, /historial, /calendario, /consejo, /coach, /cancelar
 */

import { sendMessage, sendMessageWithKeyboard, sendMessageWithInlineKeyboard, sendChatAction } from '../telegram.js';
import { MESSAGES, STATES, EMOJI } from '../constants.js';
import { getMainKeyboard } from '../keyboards/main.js';
import { getExitCoachKeyboard, getCancelKeyboard, getCalendarNavKeyboard } from '../keyboards/inline.js';
import { getState, setState, clearState } from '../state.js';

// Services
import { getRecentWorkouts } from '../services/workout.js';
import { getLastWeight } from '../services/weight.js';
import { getMonthCalendar, formatCalendarText } from '../services/calendar.js';
import { getDailyTip } from '../services/coach.js';

/**
 * /start - Bienvenida
 */
export async function handleStart(chatId) {
  await sendMessageWithKeyboard(
    chatId,
    MESSAGES.WELCOME,
    getMainKeyboard()
  );

  await sendMessage(chatId, `Tu Chat ID: ${chatId}\n\nConfigura TELEGRAM_OWNER_CHAT_ID con este valor en Vercel.`, { parse_mode: null });

  clearState(chatId);
}

/**
 * /help
 */
export async function handleHelp(chatId) {
  await sendMessageWithKeyboard(
    chatId,
    MESSAGES.HELP,
    getMainKeyboard()
  );
}

/**
 * /workout - Registrar entrenamiento (texto libre)
 */
export async function handleWorkout(chatId) {
  setState(chatId, STATES.WORKOUT_INPUT);

  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.WORKOUT_PROMPT,
    getCancelKeyboard()
  );
}

/**
 * /peso - Registrar peso corporal
 */
export async function handleWeight(chatId) {
  const lastWeight = await getLastWeight();

  setState(chatId, STATES.WEIGHT_INPUT);

  const lastWeightStr = lastWeight
    ? `${lastWeight.weight} kg (${new Date(lastWeight.date).toLocaleDateString('es')})`
    : null;

  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.WEIGHT_PROMPT(lastWeightStr),
    getCancelKeyboard()
  );
}

/**
 * /historial - Ver últimos entrenamientos
 */
export async function handleHistory(chatId) {
  await sendChatAction(chatId, 'typing');

  const workouts = await getRecentWorkouts(7);

  if (!workouts || workouts.length === 0) {
    await sendMessage(chatId, MESSAGES.NO_HISTORY);
    return;
  }

  let text = MESSAGES.HISTORY_HEADER + '\n';

  for (const w of workouts) {
    const dateStr = new Date(w.date).toLocaleDateString('es', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    const isRest = w.muscleGroup === 'Descanso';
    const displayGroup = isRest && w.didCardio ? 'Descanso activo' : w.muscleGroup;
    const emoji = isRest ? EMOJI.REST : EMOJI.WORKOUT;

    let details = '';
    if (!isRest) {
      const duration = w.durationMinutes || 0;
      const calories = w.totalCalories ? Math.round(w.totalCalories) : 0;
      details = ` (${duration}min, ${calories}kcal)`;

      if (w.fatigueLevel) details += ` fatiga:${w.fatigueLevel}/10`;
      if (w.rirScore !== undefined && w.rirScore !== null) details += ` RIR:${w.rirScore}/5`;
    }

    text += `${emoji} *${dateStr}* - ${displayGroup}${details}\n`;

    // Show exercises
    if (!isRest && w.sets && w.sets.length > 0) {
      for (const s of w.sets) {
        text += `  _${s.exercise}: ${s.weight}kg ${s.sets}x${s.reps}_\n`;
      }
    }
  }

  await sendMessage(chatId, text);
}

/**
 * /calendario - Ver calendario del mes
 */
export async function handleCalendar(chatId, month = null, year = null) {
  await sendChatAction(chatId, 'typing');

  const now = new Date();
  const targetMonth = month !== null ? month : now.getMonth();
  const targetYear = year !== null ? year : now.getFullYear();

  const calendar = await getMonthCalendar(targetYear, targetMonth);

  if (!calendar) {
    await sendMessage(chatId, 'Error al cargar el calendario.');
    return;
  }

  const text = formatCalendarText(calendar);

  await sendMessageWithInlineKeyboard(
    chatId,
    text,
    getCalendarNavKeyboard(targetMonth, targetYear)
  );
}

/**
 * /consejo - Consejo del día del Coach
 */
export async function handleDailyTip(chatId) {
  await sendChatAction(chatId, 'typing');

  const tip = await getDailyTip();

  await sendMessage(chatId, MESSAGES.COACH_DAILY_TIP(tip.message));
}

/**
 * /coach - Iniciar chat con el Coach AI
 */
export async function handleCoach(chatId) {
  setState(chatId, STATES.COACH_CHAT, { conversationHistory: [] });

  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.COACH_ACTIVATED,
    getExitCoachKeyboard()
  );
}

/**
 * /cancelar - Cancelar operación actual
 */
export async function handleCancel(chatId) {
  clearState(chatId);

  await sendMessageWithKeyboard(
    chatId,
    MESSAGES.OPERATION_CANCELLED,
    getMainKeyboard()
  );
}

/**
 * /reset - Reiniciar el bot
 */
export async function handleReset(chatId) {
  clearState(chatId);

  await sendMessage(chatId, '_Reiniciando bot..._', { reply_markup: { remove_keyboard: true } });

  setTimeout(() => handleStart(chatId), 500);
}

/**
 * Router de comandos
 */
export async function handleCommand(chatId, command) {
  switch (command) {
    case '/start':
      return handleStart(chatId);
    case '/reset':
      return handleReset(chatId);
    case '/help':
      return handleHelp(chatId);
    case '/workout':
      return handleWorkout(chatId);
    case '/peso':
      return handleWeight(chatId);
    case '/historial':
      return handleHistory(chatId);
    case '/calendario':
      return handleCalendar(chatId);
    case '/consejo':
      return handleDailyTip(chatId);
    case '/coach':
      return handleCoach(chatId);
    case '/cancelar':
      return handleCancel(chatId);
    default:
      return null;
  }
}

export default {
  handleStart,
  handleHelp,
  handleWorkout,
  handleWeight,
  handleHistory,
  handleCalendar,
  handleDailyTip,
  handleCoach,
  handleCancel,
  handleReset,
  handleCommand,
};
