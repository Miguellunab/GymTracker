/**
 * Handler de Comandos
 * /start, /help, /workout, /peso, /historial, /calendario, /consejo, /coach, /cancelar
 */

import { sendMessage, sendMessageWithKeyboard, sendMessageWithInlineKeyboard, sendChatAction } from '../telegram.js';
import { MESSAGES, STATES, EMOJI } from '../constants.js';
import { getMainKeyboard } from '../keyboards/main.js';
import { getRoutineKeyboard, getExitCoachKeyboard, getCancelKeyboard } from '../keyboards/inline.js';
import { getState, setState, clearState, initWorkoutState } from '../state.js';

// Services
import { getRoutines } from '../services/routines.js';
import { getRecentWorkouts } from '../services/workout.js';
import { getLastWeight } from '../services/weight.js';
import { getMonthCalendar, formatCalendarText } from '../services/calendar.js';
import { getDailyTip } from '../services/coach.js';
import { getCalendarNavKeyboard } from '../keyboards/inline.js';

/**
 * /start - Bienvenida e inicialización
 */
export async function handleStart(chatId) {
  // Mostrar mensaje de bienvenida con teclado permanente
  await sendMessageWithKeyboard(
    chatId,
    MESSAGES.WELCOME,
    getMainKeyboard()
  );
  
  // Informar el chat_id para configuración
  await sendMessage(chatId, `_Tu Chat ID: \`${chatId}\`_\n\n_Configura TELEGRAM\\_OWNER\\_CHAT\\_ID con este valor._`);
  
  clearState(chatId);
}

/**
 * /help - Mostrar ayuda
 */
export async function handleHelp(chatId) {
  await sendMessageWithKeyboard(
    chatId,
    MESSAGES.HELP,
    getMainKeyboard()
  );
}

/**
 * /workout - Iniciar registro de entrenamiento
 */
export async function handleWorkout(chatId) {
  await sendChatAction(chatId, 'typing');
  
  // Obtener rutinas disponibles
  const routines = await getRoutines();
  
  if (!routines || routines.length === 0) {
    await sendMessage(chatId, 'No hay rutinas configuradas. Crea rutinas desde la web primero.');
    return;
  }
  
  // Inicializar estado del workout
  initWorkoutState(chatId);
  
  // Mostrar selector de rutinas
  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.SELECT_ROUTINE,
    getRoutineKeyboard(routines)
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
    
    const emoji = w.routineName === 'Descanso' ? EMOJI.REST : EMOJI.WORKOUT;
    
    let details = '';
    if (w.routineName !== 'Descanso') {
      const duration = w.durationSeconds ? Math.round(w.durationSeconds / 60) : 0;
      const calories = w.totalCalories || 0;
      details = duration || calories ? ` (${duration}min, ${calories}kcal)` : '';
    }
    
    text += `${emoji} *${dateStr}* - ${w.routineName}${details}\n`;
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
 * Router de comandos
 */
export async function handleCommand(chatId, command, args = '') {
  switch (command) {
    case '/start':
      return handleStart(chatId);
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
  handleCommand,
};
