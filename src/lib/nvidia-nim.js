import { ensureExerciseCatalog, getRelevantExerciseContext } from './exercise-catalog.js';

/**
 * Cliente dual de IA para GymTracker (todo via GROQ)
 * - FAST: moonshotai/kimi-k2-instruct-0905 → coach, tips, chat rapido
 * - ANALYSIS: llama-3.3-70b-versatile → analisis de workout (mas potente)
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_FAST = 'moonshotai/kimi-k2-instruct-0905';
const MODEL_ANALYSIS = 'llama-3.3-70b-versatile';

/**
 * Llamada a la IA via GROQ
 * @param {Array} messages - [{role, content}]
 * @param {Object} options
 * @param {string} options.model - 'fast' (kimi-k2) o 'analysis' (llama-3.3-70b)
 */
export async function chat(messages, options = {}) {
  const {
    temperature = 0.6,
    maxTokens = 4096,
    model = 'fast',
  } = options;

  const modelId = model === 'analysis' ? MODEL_ANALYSIS : MODEL_FAST;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY no configurada');
  }

  const body = {
    model: modelId,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
    stream: false,
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI Error (${modelId}):`, response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content.trim()) {
    throw new Error('Modelo devolvio respuesta vacia');
  }

  return content;
}

/**
 * Chat con respuesta JSON parseada
 */
export async function chatJSON(messages, options = {}) {
  const content = await chat(messages, options);

  try {
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Error parseando JSON:', content.slice(0, 300));
    throw new Error('Respuesta no es JSON valido');
  }
}

/**
 * Genera contexto de reportes semanales para system prompts
 */
export async function buildReportContext(prisma) {
  await ensureExerciseCatalog(prisma);
  const now = new Date();

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();
  const prevWeek = currentWeek === 1 ? 52 : currentWeek - 1;
  const prevYear = currentWeek === 1 ? currentYear - 1 : currentYear;

  const [currentReport, previousReport] = await Promise.all([
    prisma.weeklyReport.findUnique({
      where: { weekNumber_year: { weekNumber: currentWeek, year: currentYear } }
    }).catch(() => null),
    prisma.weeklyReport.findUnique({
      where: { weekNumber_year: { weekNumber: prevWeek, year: prevYear } }
    }).catch(() => null),
  ]);

  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);

  const recentSessions = await prisma.workoutSession.findMany({
    where: { date: { gte: start7 } },
    orderBy: { date: 'desc' },
    include: { sets: true }
  });

  const lastWeight = await prisma.weightLog.findFirst({
    orderBy: { date: 'desc' }
  });

  let context = `Fecha actual: ${now.toISOString().slice(0, 10)}.\n`;
  context += `Peso corporal actual: ${lastWeight ? lastWeight.weight + ' kg' : 'Sin registrar'}.\n`;
  context += `Sesiones ultimos 7 dias: ${recentSessions.length}.\n\n`;

  if (recentSessions.length > 0) {
    context += 'Sesiones recientes:\n';
    for (const session of recentSessions) {
      const dateStr = new Date(session.date).toISOString().slice(0, 10);
      const muscleGroup = session.muscleGroup || 'Sin especificar';
      const fatigue = session.fatigueLevel ? `Fatiga: ${session.fatigueLevel}/10` : '';
      const nit = session.nitRating ? `NIT: ${session.nitRating}/10` : '';
      const cal = session.totalCalories ? `${session.totalCalories} kcal` : '';
      const cardio = session.didCardio ? `Cardio: ${session.cardioMinutes}min` : '';

      context += `- ${dateStr}: ${muscleGroup} | ${cal} ${fatigue} ${nit} ${cardio}\n`;

      if (session.sets && session.sets.length > 0) {
        const exerciseSets = {};
        for (const set of session.sets) {
          if (!exerciseSets[set.exerciseName]) {
            exerciseSets[set.exerciseName] = [];
          }
          exerciseSets[set.exerciseName].push(`${set.weight}kg x${set.reps}`);
        }
        for (const [name, sets] of Object.entries(exerciseSets)) {
          context += `  * ${name}: ${sets.join(', ')}\n`;
        }
      }
    }
    context += '\n';
  }

  const recentExerciseContext = await getRelevantExerciseContext(prisma, 'jalon prensa hack sentadilla press banca curl remo');
  if (recentExerciseContext) {
    context += `Memoria de ejercicios:\n${recentExerciseContext}\n\n`;
  }

  if (currentReport) {
    context += `REPORTE SEMANAL ACTUAL (Semana ${currentWeek}):\n`;
    try {
      const reportData = JSON.parse(currentReport.content);
      context += JSON.stringify(reportData, null, 2);
    } catch {
      context += currentReport.content;
    }
    context += '\n\n';
  }

  if (previousReport) {
    context += `REPORTE SEMANAL ANTERIOR (Semana ${prevWeek}):\n`;
    try {
      const reportData = JSON.parse(previousReport.content);
      context += JSON.stringify(reportData, null, 2);
    } catch {
      context += previousReport.content;
    }
    context += '\n\n';
  }

  return context;
}
