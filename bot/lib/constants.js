/**
 * Constantes y configuración del Bot de Telegram
 */

// Configuración del bot
export const BOT_CONFIG = {
  TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  OWNER_CHAT_ID: process.env.TELEGRAM_OWNER_CHAT_ID,
  WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
};

// Estados de conversación
export const STATES = {
  IDLE: 'idle',
  // Workout Flow (free text)
  WORKOUT_INPUT: 'workout_input',           // Esperando texto libre del entreno
  WORKOUT_CONFIRM: 'workout_confirm',       // Confirmando parseo
  WORKOUT_AMBIGUITY: 'workout_ambiguity',
  // Weight Flow
  WEIGHT_INPUT: 'weight_input',
  // Coach Flow
  COACH_CHAT: 'coach_chat',
};

// Mensajes del Bot
export const MESSAGES = {
  WELCOME: `
*Bienvenido a GymTracker Bot*

Soy tu asistente personal de entrenamiento. Desde aqui puedes:

- Registrar tus entrenamientos (texto libre)
- Consultar tu historial
- Hablar con el Coach AI
- Registrar tu peso

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

*Registro rapido:*
Puedes escribir tu entrenamiento directamente:
"Hice press banca 80x10x3, remo 70x12x3. Pecho/Espalda, 60 min, me senti bien"
`,

  WORKOUT_PROMPT: `
*Registrar entrenamiento*

Describe tu entreno en texto libre. Incluye:
- Grupo muscular (Pecho/Espalda, Pierna, Brazos)
- Ejercicios con peso, series y reps
- Si hiciste cardio (tipo y duracion)
- Duracion total en minutos
- Como te sentiste

Ejemplo:
"Pecho/Espalda. Press banca 80kg 3x10, remo barra 70kg 3x12, jalon al pecho 60kg 3x10. Caminadora 15 min. Total 65 min. Me senti fuerte."
`,

  CONFIRM_PARSED_WORKOUT: (summary) => `
*He interpretado tu entrenamiento:*

${summary}

Es correcto?
`,

  WEIGHT_PROMPT: (lastWeight) => `
*Registrar peso*

${lastWeight ? `Ultimo registro: ${lastWeight}` : 'Sin registros previos'}

Escribe tu peso actual en kg:
`,

  WEIGHT_SAVED: (weight, diff) => `
*Peso registrado: ${weight} kg*
${diff ? `\n${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg desde el ultimo registro` : ''}
`,

  HISTORY_HEADER: '*Ultimos entrenamientos:*\n',

  NO_HISTORY: 'No hay entrenamientos registrados aun.',

  COACH_ACTIVATED: `
*Coach AI activado*

Hazme cualquier pregunta sobre tu entrenamiento:
- Que deberia entrenar hoy?
- Como voy con mi progreso?
- Dame un plan para esta semana

Tambien puedo modificar o eliminar entrenamientos si me lo pides.

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

  WORKOUT_AMBIGUITY_PROMPT: (question, original) => `
*Necesito aclarar un ejercicio antes de guardar*

Ejercicio: ${original}
${question}
`,

  REST_DAY_MARKED: 'Dia de descanso registrado.',

  CALENDAR_HEADER: (month, year) => `*Calendario - ${month} ${year}*\n`,

  WORKOUT_SAVED: (summary) => `
*Entrenamiento guardado!*

${summary}

Buen trabajo!
`,
};

// Emojis
export const EMOJI = {
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
  MUSCLE: '💪',
  STAR: '⭐',
};

// Callback data prefixes
export const CALLBACKS = {
  // Workout
  WORKOUT_CONFIRM: 'workout_confirm',
  WORKOUT_CANCEL: 'workout_cancel',
  // Calendar navigation
  CALENDAR_PREV: 'cal_prev_',
  CALENDAR_NEXT: 'cal_next_',
  // Coach
  COACH_ANALYZE: 'coach_analyze',
  // General
  CANCEL: 'cancel',
};

// Nombres de los meses en español
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Dias de la semana abreviados
export const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
