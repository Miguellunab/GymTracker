/**
 * Constantes y configuración del Bot de Telegram
 */

// Configuración del bot
export const BOT_CONFIG = {
  TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  OWNER_CHAT_ID: process.env.TELEGRAM_OWNER_CHAT_ID,
  WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
};

// Tiempos de descanso en segundos
export const REST_TIMES = {
  '3min': 180,
  '4min': 240,
  '5min': 300,
};

// Estados de conversación
export const STATES = {
  IDLE: 'idle',
  // Workout Flow
  WORKOUT_SELECT_ROUTINE: 'workout_select_routine',
  WORKOUT_SELECT_EXERCISES: 'workout_select_exercises',
  WORKOUT_INPUT_SETS: 'workout_input_sets',
  WORKOUT_CARDIO: 'workout_cardio',
  WORKOUT_CARDIO_MINUTES: 'workout_cardio_minutes',
  WORKOUT_CARDIO_INTENSITY: 'workout_cardio_intensity',
  WORKOUT_CONFIRM: 'workout_confirm',
  // Weight Flow
  WEIGHT_INPUT: 'weight_input',
  // Coach Flow
  COACH_CHAT: 'coach_chat',
  // Timer Custom
  TIMER_CUSTOM: 'timer_custom',
  // Workout Text Libre
  WORKOUT_TEXT_CONFIRM: 'workout_text_confirm',
};

// Mensajes del Bot
export const MESSAGES = {
  WELCOME: `
*Bienvenido a GymTracker Bot*

Soy tu asistente personal de entrenamiento. Desde aqui puedes:

- Registrar tus entrenamientos
- Usar el timer de descanso
- Consultar tu historial
- Hablar con el Coach AI
- Registrar tu peso

El teclado de abajo siempre estara visible. Usa los botones del timer entre series.

Escribe /help para ver todos los comandos.
`,

  HELP: `
*Comandos disponibles:*

/start - Iniciar el bot
/help - Ver esta ayuda
/workout - Registrar entrenamiento
/peso - Registrar peso corporal
/historial - Ver ultimos entrenamientos
/calendario - Ver calendario del mes
/consejo - Consejo del dia del Coach
/coach - Chatear con el Coach AI
/cancelar - Cancelar operacion actual

*Timer de descanso:*
Usa los botones del teclado (3min, 4min, 5min) o escribe los minutos que quieras.

*Registro rapido:*
Puedes escribir tu entrenamiento en texto libre:
"Hice press banca 80x10, 80x8. Remo 70x12"
`,

  TIMER_STARTED: (minutes) => `*Timer iniciado: ${minutes} minutos*\n\nDescansa, te avisare cuando termine.`,
  
  TIMER_UPDATE: (remaining) => `*Descanso:* ${remaining}`,
  
  TIMER_FINISHED: `
*DESCANSO TERMINADO*

Hora de la siguiente serie!
`,

  TIMER_CANCELLED: 'Timer cancelado.',

  SELECT_ROUTINE: `
*Que entrenaste hoy?*

Selecciona una rutina o marca Descanso:
`,

  SELECT_EXERCISES: (routineName) => `
*Rutina: ${routineName}*

Selecciona los ejercicios que realizaste:
(Toca para marcar/desmarcar)
`,

  INPUT_SETS: (exerciseName, setNumber) => `
*${exerciseName}*
Serie ${setNumber}

Ingresa: peso x reps
Ejemplo: 80x10
`,

  CARDIO_QUESTION: 'Hiciste cardio hoy?',
  
  CARDIO_MINUTES: 'Cuantos minutos de cardio?',
  
  CARDIO_INTENSITY: 'Cual fue la intensidad?',

  WORKOUT_SAVED: (summary) => `
*Entrenamiento guardado!*

${summary}

Buen trabajo!
`,

  WEIGHT_PROMPT: (lastWeight) => `
*Registrar peso*

${lastWeight ? `Ultimo registro: ${lastWeight} kg` : 'Sin registros previos'}

Escribe tu peso actual en kg:
`,

  WEIGHT_SAVED: (weight, diff) => `
*Peso registrado: ${weight} kg*
${diff ? `\n${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg desde el ultimo registro` : ''}
`,

  HISTORY_HEADER: '*Ultimos entrenamientos:*\n',
  
  NO_HISTORY: 'No hay entrenamientos registrados aun.',

  CALENDAR_HEADER: (month, year) => `*Calendario - ${month} ${year}*\n`,

  COACH_ACTIVATED: `
*Coach AI activado*

Hazme cualquier pregunta sobre tu entrenamiento:
- Que deberia entrenar hoy?
- Como voy con mi progreso?
- Dame un plan para esta semana

Escribe /cancelar para salir del chat.
`,

  COACH_DAILY_TIP: (tip) => `
*Consejo del dia:*

${tip}
`,

  OPERATION_CANCELLED: 'Operacion cancelada. De vuelta al menu principal.',

  UNAUTHORIZED: 'No tienes permiso para usar este bot.',

  ERROR: 'Ocurrio un error. Intenta de nuevo.',

  PARSING_WORKOUT: 'Analizando tu entrenamiento...',

  CONFIRM_PARSED_WORKOUT: (summary) => `
*He interpretado tu entrenamiento:*

${summary}

Es correcto?
`,

  REST_DAY_MARKED: 'Dia de descanso registrado.',
};

// Emojis
export const EMOJI = {
  TIMER: '⏱️',
  WORKOUT: '🏋️',
  HISTORY: '📊',
  CALENDAR: '📅',
  WEIGHT: '⚖️',
  COACH: '🤖',
  CHECK: '✅',
  UNCHECK: '⬜',
  FIRE: '🔥',
  REST: '😴',
  CARDIO: '🏃',
  BELL: '🔔',
  MUSCLE: '💪',
  STAR: '⭐',
};

// Callback data prefixes
export const CALLBACKS = {
  // Timer
  TIMER_3: 'timer_3',
  TIMER_4: 'timer_4',
  TIMER_5: 'timer_5',
  TIMER_CUSTOM: 'timer_custom',
  TIMER_CANCEL: 'timer_cancel',
  // Workout
  ROUTINE_SELECT: 'routine_',
  EXERCISE_TOGGLE: 'exercise_',
  EXERCISE_DONE: 'exercise_done',
  SET_ADD: 'set_add',
  SET_DONE: 'set_done',
  SET_WEIGHT_UP: 'set_weight_up',
  SET_WEIGHT_DOWN: 'set_weight_down',
  SET_REPS_UP: 'set_reps_up',
  SET_REPS_DOWN: 'set_reps_down',
  CARDIO_YES: 'cardio_yes',
  CARDIO_NO: 'cardio_no',
  CARDIO_MINUTES: 'cardio_min_',
  CARDIO_INTENSITY: 'cardio_int_',
  WORKOUT_CONFIRM: 'workout_confirm',
  WORKOUT_CANCEL: 'workout_cancel',
  // Text libre
  TEXT_CONFIRM: 'text_confirm',
  TEXT_EDIT: 'text_edit',
  // Calendar navigation
  CALENDAR_PREV: 'cal_prev_',
  CALENDAR_NEXT: 'cal_next_',
  // History
  HISTORY_DETAIL: 'history_',
  // Coach
  COACH_ANALYZE: 'coach_analyze',
  // General
  BACK: 'back',
  CANCEL: 'cancel',
};

// Intensidades de cardio
export const CARDIO_INTENSITIES = ['Baja', 'Media', 'Alta'];

// Minutos de cardio predefinidos
export const CARDIO_MINUTES_OPTIONS = [10, 15, 20, 25, 30];

// Nombres de los meses en español
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Dias de la semana abreviados
export const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
