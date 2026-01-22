/**
 * Handler de Mensajes de Texto
 * Procesa mensajes que no son comandos
 */

import { 
  sendMessage, 
  sendMessageWithInlineKeyboard, 
  sendChatAction,
  sendMessageWithKeyboard
} from '../telegram.js';
import { MESSAGES, STATES, EMOJI } from '../constants.js';
import { getState, setState, clearState, updateData, setParsedWorkout } from '../state.js';
import { isMainKeyboardAction, getMainKeyboard } from '../keyboards/main.js';
import { getTextWorkoutConfirmKeyboard, getCancelKeyboard } from '../keyboards/inline.js';

// Handlers
import { startTimer, handleCustomTimer } from './timer.js';
import { 
  handleWorkout, 
  handleHistory, 
  handleCalendar, 
  handleWeight as handleWeightCommand, 
  handleCoach, 
  handleDailyTip,
  handleCancel 
} from './commands.js';

// Services
import { logWeight, getWeightDiff } from '../services/weight.js';
import { chatWithCoach, parseWorkoutText } from '../services/coach.js';
import { markRestDay } from '../services/workout.js';

/**
 * Handler principal de mensajes de texto
 */
export async function handleMessage(chatId, text) {
  // Verificar si es una acción del teclado principal
  const mainAction = isMainKeyboardAction(text);
  
  if (mainAction) {
    return handleMainKeyboardAction(chatId, mainAction);
  }
  
  // Verificar estado actual para flujos conversacionales
  const state = getState(chatId);
  
  switch (state.state) {
    case STATES.WEIGHT_INPUT:
      return handleWeightInput(chatId, text);
    
    case STATES.COACH_CHAT:
      return handleCoachChat(chatId, text);
    
    case STATES.TIMER_CUSTOM:
      return handleCustomTimer(chatId, text);
    
    case STATES.IDLE:
      // En estado idle, intentar parsear como workout de texto libre
      return handleFreeTextWorkout(chatId, text);
    
    default:
      // Otros estados - ignorar o informar
      return;
  }
}

/**
 * Maneja acciones del teclado principal
 */
async function handleMainKeyboardAction(chatId, action) {
  // Cancelar cualquier estado previo excepto si estamos en coach chat
  const currentState = getState(chatId);
  if (currentState.state !== STATES.COACH_CHAT && 
      currentState.state !== STATES.IDLE &&
      !action.startsWith('timer_')) {
    // Mantener estado para timers durante otros flujos
  }
  
  switch (action) {
    case 'timer_3':
      return startTimer(chatId, 3);
    
    case 'timer_4':
      return startTimer(chatId, 4);
    
    case 'timer_5':
      return startTimer(chatId, 5);
    
    case 'workout':
      return handleWorkout(chatId);
    
    case 'history':
      return handleHistory(chatId);
    
    case 'weight':
      return handleWeightCommand(chatId);
    
    case 'coach':
      return handleCoach(chatId);
    
    case 'calendar':
      return handleCalendar(chatId);
    
    case 'rest':
      return handleRestDay(chatId);
    
    default:
      return;
  }
}

/**
 * Maneja input de peso corporal
 */
async function handleWeightInput(chatId, text) {
  // Validar que sea un número
  const weight = parseFloat(text.replace(',', '.'));
  
  if (isNaN(weight) || weight < 30 || weight > 300) {
    await sendMessage(chatId, 'Ingresa un peso válido (entre 30 y 300 kg).');
    return;
  }
  
  try {
    // Obtener diferencia antes de guardar
    const diff = await getWeightDiff(weight);
    
    // Guardar
    await logWeight(weight);
    
    clearState(chatId);
    
    await sendMessageWithKeyboard(
      chatId,
      MESSAGES.WEIGHT_SAVED(weight, diff),
      getMainKeyboard()
    );
    
  } catch (error) {
    console.error('Error saving weight:', error);
    await sendMessage(chatId, MESSAGES.ERROR);
  }
}

/**
 * Maneja chat con el coach
 */
async function handleCoachChat(chatId, text) {
  // Verificar si quiere salir
  if (text.toLowerCase() === '/cancelar' || text.toLowerCase() === 'salir') {
    return handleCancel(chatId);
  }
  
  await sendChatAction(chatId, 'typing');
  
  const state = getState(chatId);
  const history = state.data.conversationHistory || [];
  
  // Agregar mensaje del usuario al historial
  history.push({ role: 'user', content: text });
  
  // Obtener respuesta del coach
  const response = await chatWithCoach(text, history);
  
  // Agregar respuesta al historial
  history.push({ role: 'assistant', content: response });
  
  // Actualizar historial (mantener últimos 10 mensajes)
  updateData(chatId, { conversationHistory: history.slice(-10) });
  
  await sendMessage(chatId, `${EMOJI.COACH} ${response}`);
}

/**
 * Intenta parsear texto libre como workout
 */
async function handleFreeTextWorkout(chatId, text) {
  // Solo intentar parsear si parece un workout
  const workoutKeywords = [
    'hice', 'hoy', 'entrené', 'entrenamiento', 'press', 'remo', 'sentadilla',
    'curl', 'extensión', 'peso', 'series', 'x', 'kg', 'repeticiones',
    'cardio', 'minutos', 'banca', 'mancuernas'
  ];
  
  const lowerText = text.toLowerCase();
  const hasWorkoutKeyword = workoutKeywords.some(kw => lowerText.includes(kw));
  
  if (!hasWorkoutKeyword || text.length < 15) {
    // No parece un workout, ignorar
    return;
  }
  
  await sendChatAction(chatId, 'typing');
  await sendMessage(chatId, MESSAGES.PARSING_WORKOUT);
  
  // Parsear con IA
  const parsed = await parseWorkoutText(text);
  
  if (!parsed || !parsed.exercises || parsed.exercises.length === 0) {
    await sendMessage(chatId, 
      'No pude interpretar tu entrenamiento. Intenta con el formato:\n' +
      '"Press banca 80x10, 80x8. Remo 70x12"'
    );
    return;
  }
  
  // Formatear resumen para confirmación
  let summary = '';
  for (const ex of parsed.exercises) {
    summary += `*${ex.name}:*\n`;
    for (const set of ex.sets || []) {
      summary += `  ${set.weight}kg x ${set.reps}\n`;
    }
    summary += '\n';
  }
  
  if (parsed.cardio?.did) {
    summary += `${EMOJI.CARDIO} Cardio: ${parsed.cardio.minutes} min`;
    if (parsed.cardio.intensity) {
      summary += ` (${parsed.cardio.intensity})`;
    }
    summary += '\n';
  }
  
  if (parsed.notes) {
    summary += `\n_${parsed.notes}_`;
  }
  
  // Guardar parsed para confirmación
  setParsedWorkout(chatId, parsed);
  
  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.CONFIRM_PARSED_WORKOUT(summary),
    getTextWorkoutConfirmKeyboard()
  );
}

/**
 * Marca el día como descanso
 */
async function handleRestDay(chatId) {
  try {
    await markRestDay();
    await sendMessageWithKeyboard(
      chatId,
      `${EMOJI.REST} ${MESSAGES.REST_DAY_MARKED}`,
      getMainKeyboard()
    );
  } catch (error) {
    console.error('Error marking rest day:', error);
    await sendMessage(chatId, MESSAGES.ERROR);
  }
}

/**
 * Verifica si un texto podría ser minutos de timer custom
 */
export function isTimerMinutes(text) {
  const num = parseInt(text);
  return !isNaN(num) && num >= 1 && num <= 30;
}

export default {
  handleMessage,
  isTimerMinutes,
};
