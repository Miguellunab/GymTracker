/**
 * Handler de Callbacks (Botones Inline)
 */

import { 
  sendMessage, 
  sendMessageWithInlineKeyboard, 
  editMessage, 
  editMessageWithInlineKeyboard,
  answerCallbackQuery,
  sendChatAction,
  sendMessageWithKeyboard
} from '../telegram.js';
import { MESSAGES, STATES, CALLBACKS, EMOJI } from '../constants.js';
import { 
  getState, 
  setState, 
  clearState, 
  getWorkoutData, 
  updateWorkoutData,
  toggleExercise,
  addSetToExercise,
  getCurrentExercise,
  setCurrentExerciseIndex,
  updateData,
  getParsedWorkout
} from '../state.js';
import { 
  getExerciseKeyboard, 
  getSetInputKeyboard, 
  getCardioQuestionKeyboard,
  getCardioMinutesKeyboard,
  getCardioIntensityKeyboard,
  getDurationKeyboard,
  getWorkoutConfirmKeyboard,
  getCalendarNavKeyboard,
  getPostWorkoutKeyboard
} from '../keyboards/inline.js';
import { getMainKeyboard } from '../keyboards/main.js';

// Services
import { getRoutineById } from '../services/routines.js';
import { createWorkout, markRestDay, calculateWorkoutStats } from '../services/workout.js';
import { handleTimerCallback, cancelTimer } from './timer.js';
import { handleCalendar } from './commands.js';
import { analyzeWorkout } from '../services/coach.js';

/**
 * Handler principal de callbacks
 */
export async function handleCallback(chatId, messageId, callbackData, callbackQueryId) {
  // Responder al callback para quitar el loading
  await answerCallbackQuery(callbackQueryId);
  
  // Timer callbacks
  if (callbackData.startsWith('timer_')) {
    return handleTimerCallback(chatId, callbackData, callbackQueryId);
  }
  
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
  
  // Rutina seleccionada
  if (callbackData.startsWith(CALLBACKS.ROUTINE_SELECT)) {
    return handleRoutineSelect(chatId, messageId, callbackData);
  }
  
  // Toggle ejercicio
  if (callbackData.startsWith(CALLBACKS.EXERCISE_TOGGLE)) {
    return handleExerciseToggle(chatId, messageId, callbackData);
  }
  
  // Ejercicios completados, pasar a input de series
  if (callbackData === CALLBACKS.EXERCISE_DONE) {
    return handleExercisesDone(chatId, messageId);
  }
  
  // Controles de set (peso/reps)
  if (callbackData.startsWith('set_')) {
    return handleSetControl(chatId, messageId, callbackData);
  }
  
  // Cardio callbacks
  if (callbackData === CALLBACKS.CARDIO_YES || callbackData === CALLBACKS.CARDIO_NO) {
    return handleCardioQuestion(chatId, messageId, callbackData);
  }
  
  if (callbackData.startsWith(CALLBACKS.CARDIO_MINUTES)) {
    return handleCardioMinutes(chatId, messageId, callbackData);
  }
  
  if (callbackData.startsWith(CALLBACKS.CARDIO_INTENSITY)) {
    return handleCardioIntensity(chatId, messageId, callbackData);
  }
  
  // Duración del entrenamiento
  if (callbackData.startsWith('duration_min_')) {
    return handleDurationMinutes(chatId, messageId, callbackData);
  }
  
  // Confirmar workout
  if (callbackData === CALLBACKS.WORKOUT_CONFIRM) {
    return handleWorkoutConfirm(chatId, messageId);
  }
  
  if (callbackData === CALLBACKS.WORKOUT_CANCEL) {
    clearState(chatId);
    await editMessage(chatId, messageId, 'Workout cancelado.');
    return;
  }
  
  // Confirmar workout parseado
  if (callbackData === CALLBACKS.TEXT_CONFIRM) {
    return handleTextWorkoutConfirm(chatId, messageId);
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
 * Selección de rutina
 */
async function handleRoutineSelect(chatId, messageId, callbackData) {
  const routineId = callbackData.replace(CALLBACKS.ROUTINE_SELECT, '');
  
  // Día de descanso
  if (routineId === 'rest') {
    await markRestDay();
    clearState(chatId);
    await editMessage(chatId, messageId, `${EMOJI.REST} ${MESSAGES.REST_DAY_MARKED}`);
    return;
  }
  
  // Obtener rutina con ejercicios
  const routine = await getRoutineById(routineId);
  
  if (!routine) {
    await editMessage(chatId, messageId, 'Rutina no encontrada.');
    return;
  }
  
  // Actualizar estado
  updateWorkoutData(chatId, { 
    routineName: routine.name,
    routineExercises: routine.exercises 
  });
  setState(chatId, STATES.WORKOUT_SELECT_EXERCISES);
  
  // Mostrar ejercicios para seleccionar
  const selectedIds = getWorkoutData(chatId)?.selectedExercises?.map(e => e.id) || [];
  
  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    MESSAGES.SELECT_EXERCISES(routine.name),
    getExerciseKeyboard(routine.exercises, selectedIds)
  );
}

/**
 * Toggle de ejercicio (marcar/desmarcar)
 */
async function handleExerciseToggle(chatId, messageId, callbackData) {
  const exerciseId = callbackData.replace(CALLBACKS.EXERCISE_TOGGLE, '');
  const workout = getWorkoutData(chatId);
  
  if (!workout) return;
  
  // Encontrar nombre del ejercicio
  const exercise = workout.routineExercises?.find(e => e.id === exerciseId);
  if (!exercise) return;
  
  // Toggle
  toggleExercise(chatId, exerciseId, exercise.name);
  
  // Actualizar keyboard
  const selectedIds = getWorkoutData(chatId)?.selectedExercises?.map(e => e.id) || [];
  
  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    MESSAGES.SELECT_EXERCISES(workout.routineName),
    getExerciseKeyboard(workout.routineExercises, selectedIds)
  );
}

/**
 * Ejercicios seleccionados, pasar a input de series
 */
async function handleExercisesDone(chatId, messageId) {
  const workout = getWorkoutData(chatId);
  
  if (!workout || !workout.selectedExercises || workout.selectedExercises.length === 0) {
    await answerCallbackQuery(null, 'Selecciona al menos un ejercicio', true);
    return;
  }
  
  // Iniciar input de series
  setState(chatId, STATES.WORKOUT_INPUT_SETS);
  setCurrentExerciseIndex(chatId, 0);
  
  // Mostrar primer ejercicio
  await showSetInput(chatId, messageId);
}

/**
 * Muestra el input de series para el ejercicio actual
 */
async function showSetInput(chatId, messageId) {
  const exercise = getCurrentExercise(chatId);
  const state = getState(chatId);
  
  if (!exercise) {
    // No hay más ejercicios, pasar a cardio
    setState(chatId, STATES.WORKOUT_CARDIO);
    await editMessageWithInlineKeyboard(
      chatId,
      messageId,
      `${EMOJI.CARDIO} ${MESSAGES.CARDIO_QUESTION}`,
      getCardioQuestionKeyboard()
    );
    return;
  }
  
  const setNumber = exercise.setsCount + 1;
  const currentWeight = state.data.currentSetInput?.weight || 0;
  const currentReps = state.data.currentSetInput?.reps || 0;
  const currentRir = state.data.currentSetInput?.rir ?? null;
  
  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    MESSAGES.INPUT_SETS(exercise.name, setNumber),
    getSetInputKeyboard(currentWeight, currentReps, setNumber, currentRir)
  );
}

/**
 * Controles de peso/reps/RIR
 */
async function handleSetControl(chatId, messageId, callbackData) {
  const state = getState(chatId);
  const currentInput = state.data.currentSetInput || { weight: 0, reps: 0, rir: null };
  
  // Cambio de peso
  if (callbackData.startsWith('set_w_')) {
    const delta = parseFloat(callbackData.replace('set_w_', ''));
    currentInput.weight = Math.max(0, currentInput.weight + delta);
  }
  
  // Cambio de reps
  if (callbackData.startsWith('set_r_')) {
    const delta = parseInt(callbackData.replace('set_r_', ''));
    currentInput.reps = Math.max(0, currentInput.reps + delta);
  }
  
  // Reps directos
  if (callbackData.startsWith('set_reps_')) {
    const reps = parseInt(callbackData.replace('set_reps_', ''));
    currentInput.reps = reps;
  }
  
  // RIR (Reps in Reserve)
  if (callbackData.startsWith('set_rir_')) {
    const rir = parseInt(callbackData.replace('set_rir_', ''));
    currentInput.rir = rir;
  }
  
  // Guardar serie
  if (callbackData === CALLBACKS.SET_ADD) {
    const exercise = getCurrentExercise(chatId);
    if (exercise && currentInput.weight > 0 && currentInput.reps > 0) {
      addSetToExercise(chatId, exercise.id, currentInput.weight, currentInput.reps, currentInput.rir);
      // Mantener peso y RIR para siguiente serie
      currentInput.reps = 0;
    }
  }
  
  // Siguiente ejercicio
  if (callbackData === CALLBACKS.SET_DONE) {
    const currentIndex = state.data.currentExerciseIndex || 0;
    setCurrentExerciseIndex(chatId, currentIndex + 1);
    await showSetInput(chatId, messageId);
    return;
  }
  
  updateData(chatId, { currentSetInput: currentInput });
  
  // Actualizar display
  const exercise = getCurrentExercise(chatId);
  if (exercise) {
    const setNumber = exercise.setsCount + 1;
    await editMessageWithInlineKeyboard(
      chatId,
      messageId,
      MESSAGES.INPUT_SETS(exercise.name, setNumber),
      getSetInputKeyboard(currentInput.weight, currentInput.reps, setNumber, currentInput.rir)
    );
  }
}

/**
 * Pregunta de cardio
 */
async function handleCardioQuestion(chatId, messageId, callbackData) {
  const didCardio = callbackData === CALLBACKS.CARDIO_YES;
  
  updateWorkoutData(chatId, {
    cardio: { did: didCardio, minutes: 0, intensity: null }
  });
  
  if (didCardio) {
    setState(chatId, STATES.WORKOUT_CARDIO_MINUTES);
    await editMessageWithInlineKeyboard(
      chatId,
      messageId,
      MESSAGES.CARDIO_MINUTES,
      getCardioMinutesKeyboard()
    );
  } else {
    // Ir a preguntar duración
    await showDurationQuestion(chatId, messageId);
  }
}

/**
 * Minutos de cardio
 */
async function handleCardioMinutes(chatId, messageId, callbackData) {
  const minutes = parseInt(callbackData.replace(CALLBACKS.CARDIO_MINUTES, ''));
  
  const workout = getWorkoutData(chatId);
  workout.cardio.minutes = minutes;
  updateWorkoutData(chatId, { cardio: workout.cardio });
  
  setState(chatId, STATES.WORKOUT_CARDIO_INTENSITY);
  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    MESSAGES.CARDIO_INTENSITY,
    getCardioIntensityKeyboard()
  );
}

/**
 * Intensidad de cardio
 */
async function handleCardioIntensity(chatId, messageId, callbackData) {
  const intensity = callbackData.replace(CALLBACKS.CARDIO_INTENSITY, '');
  
  const workout = getWorkoutData(chatId);
  workout.cardio.intensity = intensity;
  updateWorkoutData(chatId, { cardio: workout.cardio });
  
  // Ir a preguntar duración
  await showDurationQuestion(chatId, messageId);
}

/**
 * Muestra pregunta de duración
 */
async function showDurationQuestion(chatId, messageId) {
  setState(chatId, STATES.WORKOUT_DURATION);
  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    `⏱️ ${MESSAGES.DURATION_QUESTION}`,
    getDurationKeyboard()
  );
}

/**
 * Maneja selección de duración
 */
async function handleDurationMinutes(chatId, messageId, callbackData) {
  const minutes = parseInt(callbackData.replace('duration_min_', ''));
  
  updateWorkoutData(chatId, { durationMinutes: minutes });
  
  // Mostrar resumen
  await showWorkoutSummary(chatId, messageId);
}

/**
 * Muestra resumen del workout para confirmación
 */
async function showWorkoutSummary(chatId, messageId) {
  const workout = getWorkoutData(chatId);
  setState(chatId, STATES.WORKOUT_CONFIRM);
  
  // Calcular estadísticas
  const stats = calculateWorkoutStats(workout.exerciseData, workout.cardio);
  
  // Usar duración real si fue ingresada
  const durationMinutes = workout.durationMinutes || Math.round(stats.estimatedDuration / 60);
  
  // Formatear resumen
  let summary = `*Resumen del Workout*\n\n`;
  summary += `${EMOJI.WORKOUT} *Rutina:* ${workout.routineName}\n`;
  summary += `⏱️ *Duración:* ${durationMinutes} min\n\n`;
  
  // Ejercicios con series
  for (const [exerciseId, data] of Object.entries(workout.exerciseData)) {
    if (data.sets && data.sets.length > 0) {
      summary += `*${data.name}:*\n`;
      data.sets.forEach((set, i) => {
        let setLine = `  Serie ${i + 1}: ${set.weight}kg x ${set.reps}`;
        if (set.rir !== null && set.rir !== undefined) {
          setLine += ` (RIR ${set.rir})`;
        }
        summary += setLine + '\n';
      });
      summary += '\n';
    }
  }
  
  // Cardio
  if (workout.cardio.did) {
    summary += `${EMOJI.CARDIO} *Cardio:* ${workout.cardio.minutes} min (${workout.cardio.intensity})\n\n`;
  }
  
  // Estadísticas
  summary += `📊 *Estadísticas:*\n`;
  summary += `  Series totales: ${stats.totalSets}\n`;
  summary += `  Calorías estimadas: ~${stats.estimatedCalories} kcal\n`;
  
  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    summary,
    getWorkoutConfirmKeyboard()
  );
}

/**
 * Confirmar y guardar workout
 */
async function handleWorkoutConfirm(chatId, messageId) {
  const workout = getWorkoutData(chatId);
  
  if (!workout) {
    await editMessage(chatId, messageId, 'Error: No hay datos del workout.');
    return;
  }
  
  await sendChatAction(chatId, 'typing');
  
  try {
    // Calcular stats
    const stats = calculateWorkoutStats(workout.exerciseData, workout.cardio);
    
    // Usar duración real si fue ingresada
    const durationMinutes = workout.durationMinutes || Math.round(stats.estimatedDuration / 60);
    const durationSeconds = durationMinutes * 60;
    
    // Preparar workoutData para la API (incluyendo RIR como rpe)
    const workoutData = {};
    for (const [exerciseId, data] of Object.entries(workout.exerciseData)) {
      workoutData[exerciseId] = data.sets.map(s => ({
        weight: s.weight,
        reps: s.reps,
        isWarmup: false,
        // RIR se guarda como rpe (invertido: RIR 0 = RPE 10, RIR 3 = RPE 7)
        rpe: s.rir !== null ? (10 - s.rir) : null
      }));
    }
    
    // Crear workout
    await createWorkout({
      routineName: workout.routineName,
      date: new Date(),
      durationSeconds: durationSeconds,
      totalCalories: stats.estimatedCalories,
      didCardio: workout.cardio.did,
      cardioMinutes: workout.cardio.minutes,
      cardioIntensity: workout.cardio.intensity,
      workoutData
    });
    
    clearState(chatId);
    
    // Guardar stats para análisis posterior
    updateData(chatId, { lastWorkoutStats: { ...workout, stats, durationMinutes } });
    
    const successMsg = MESSAGES.WORKOUT_SAVED(`
${EMOJI.WORKOUT} ${workout.routineName}
${EMOJI.FIRE} ${stats.totalSets} series
⏱️ ${durationMinutes} min
🔥 ~${stats.estimatedCalories} kcal
`);
    
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
 * Confirmar workout parseado de texto
 */
async function handleTextWorkoutConfirm(chatId, messageId) {
  const parsed = getParsedWorkout(chatId);
  
  if (!parsed) {
    await editMessage(chatId, messageId, 'Error: No hay datos parseados.');
    return;
  }
  
  await sendChatAction(chatId, 'typing');
  
  try {
    // Convertir parsed a formato de workout
    const workoutData = {};
    let routineName = 'Entrenamiento';
    
    for (const ex of parsed.exercises || []) {
      if (ex.id) {
        workoutData[ex.id] = ex.sets.map(s => ({
          weight: s.weight || 0,
          reps: s.reps || 0,
          isWarmup: false
        }));
      }
    }
    
    // Calcular stats básicas
    let totalSets = 0;
    for (const sets of Object.values(workoutData)) {
      totalSets += sets.length;
    }
    
    const estimatedDuration = totalSets * 180;
    let calories = totalSets * 6;
    
    if (parsed.cardio?.did) {
      const cardioCalPerMin = parsed.cardio.intensity === 'Alta' ? 12 : 
                              parsed.cardio.intensity === 'Media' ? 9 : 6;
      calories += (parsed.cardio.minutes || 0) * cardioCalPerMin;
    }
    
    await createWorkout({
      routineName,
      date: new Date(),
      durationSeconds: estimatedDuration,
      totalCalories: Math.round(calories),
      didCardio: parsed.cardio?.did || false,
      cardioMinutes: parsed.cardio?.minutes || null,
      cardioIntensity: parsed.cardio?.intensity || null,
      notes: parsed.notes || null,
      workoutData
    });
    
    clearState(chatId);
    
    await editMessage(chatId, messageId, `${EMOJI.CHECK} Workout guardado exitosamente!`);
    
  } catch (error) {
    console.error('Error saving parsed workout:', error);
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
  const lastWorkout = state.data.lastWorkoutStats;
  
  if (!lastWorkout) {
    await sendMessage(chatId, 'No hay workout reciente para analizar.');
    return;
  }
  
  const analysis = await analyzeWorkout({
    routineName: lastWorkout.routineName,
    sets: lastWorkout.stats.totalSets,
    duration: Math.round(lastWorkout.stats.estimatedDuration / 60),
    calories: lastWorkout.stats.estimatedCalories,
    cardio: lastWorkout.cardio
  });
  
  await sendMessage(chatId, `${EMOJI.COACH} *Análisis del Coach:*\n\n${analysis}`);
}

export default {
  handleCallback,
};
