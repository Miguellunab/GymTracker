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
import { getWorkoutConfirmKeyboard, getCancelKeyboard } from '../keyboards/inline.js';

// Handlers
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
    case STATES.WORKOUT_INPUT:
      return handleWorkoutInput(chatId, text);

    case STATES.WEIGHT_INPUT:
      return handleWeightInput(chatId, text);

    case STATES.COACH_CHAT:
      return handleCoachChat(chatId, text);

    case STATES.IDLE:
      // En estado idle, intentar parsear como workout de texto libre
      return handleFreeTextWorkout(chatId, text);

    default:
      return;
  }
}

/**
 * Maneja acciones del teclado principal
 */
async function handleMainKeyboardAction(chatId, action) {
  switch (action) {
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
 * Maneja input de texto libre de workout (estado WORKOUT_INPUT)
 */
async function handleWorkoutInput(chatId, text) {
  await sendChatAction(chatId, 'typing');
  await sendMessage(chatId, MESSAGES.PARSING_WORKOUT);

  // Parsear con IA
  const parsed = await parseWorkoutText(text);

  if (!parsed || !parsed.exercises || parsed.exercises.length === 0) {
    await sendMessage(chatId,
      'No pude interpretar tu entrenamiento. Intenta con mas detalle:\n\n' +
      '"Pecho/Espalda. Press banca 80kg 3x10, remo barra 70kg 3x12. Caminadora 15 min. Total 65 min. Me senti fuerte."'
    );
    return;
  }

  // Formatear resumen para confirmación
  const summary = formatParsedSummary(parsed);

  // Guardar parsed para confirmación
  setParsedWorkout(chatId, parsed);

  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.CONFIRM_PARSED_WORKOUT(summary),
    getWorkoutConfirmKeyboard()
  );
}

/**
 * Maneja input de peso corporal
 */
async function handleWeightInput(chatId, text) {
  const weight = parseFloat(text.replace(',', '.'));

  if (isNaN(weight) || weight < 30 || weight > 300) {
    await sendMessage(chatId, 'Ingresa un peso valido (entre 30 y 300 kg).');
    return;
  }

  try {
    const diff = await getWeightDiff(weight);
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
 * Intenta parsear texto libre como workout (estado IDLE)
 */
async function handleFreeTextWorkout(chatId, text) {
  // Solo intentar parsear si parece un workout
  const workoutKeywords = [
    'hice', 'hoy', 'entrené', 'entrenamiento', 'press', 'remo', 'sentadilla',
    'curl', 'extensión', 'peso muerto', 'series', 'x', 'kg', 'repeticiones',
    'cardio', 'minutos', 'banca', 'mancuernas', 'pierna', 'pecho', 'espalda',
    'brazos', 'jalon', 'prensa', 'hack', 'dominadas'
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
      'No pude interpretar tu entrenamiento. Usa /workout para el flujo guiado, o intenta con mas detalle.'
    );
    return;
  }

  // Formatear resumen para confirmación
  const summary = formatParsedSummary(parsed);

  // Guardar parsed para confirmación
  setParsedWorkout(chatId, parsed);

  await sendMessageWithInlineKeyboard(
    chatId,
    MESSAGES.CONFIRM_PARSED_WORKOUT(summary),
    getWorkoutConfirmKeyboard()
  );
}

/**
 * Formatea un workout parseado como texto para mostrar al usuario
 */
function formatParsedSummary(parsed) {
  let summary = '';

  if (parsed.muscleGroup) {
    summary += `${EMOJI.MUSCLE} *Grupo:* ${parsed.muscleGroup}\n\n`;
  }

  for (const ex of parsed.exercises || []) {
    summary += `*${ex.name}:* ${ex.weight}kg ${ex.sets}x${ex.reps}\n`;
  }

  if (parsed.didCardio) {
    summary += `\n${EMOJI.CARDIO} Cardio: ${parsed.cardioType || 'Si'} ${parsed.cardioMinutes || ''} min\n`;
  }

  if (parsed.durationMinutes) {
    summary += `\n⏱️ Duracion: ${parsed.durationMinutes} min`;
  }

  if (parsed.totalCalories) {
    summary += `\n🔥 Calorias: ~${parsed.totalCalories} kcal`;
  }

  if (parsed.feeling) {
    summary += `\n💬 ${parsed.feeling}`;
  }

  if (parsed.nitRating) {
    summary += `\n⭐ NIT: ${parsed.nitRating}/10`;
  }

  if (parsed.fatigueLevel) {
    summary += `\n😓 Fatiga: ${parsed.fatigueLevel}/10`;
  }

  return summary;
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

export default {
  handleMessage,
};
