import { ensureExerciseCatalog, getRelevantExerciseContext } from './exercise-catalog.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SAMBANOVA_API_URL = 'https://api.sambanova.ai/v1/chat/completions';

const MODEL_REGISTRY = {
  coach_llama: {
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    label: 'Llama 70B',
  },
  coach_deepseek: {
    provider: 'sambanova',
    modelId: 'DeepSeek-R1-0528',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    label: 'DeepSeek R1',
  },
  daily: {
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    label: 'Llama 70B',
  },
  analysis: {
    provider: 'sambanova',
    modelId: 'DeepSeek-R1-0528',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    label: 'DeepSeek R1',
  },
};

function getModelConfig(model = 'coach_llama') {
  return MODEL_REGISTRY[model] || MODEL_REGISTRY.coach_llama;
}

function getApiUrl(provider) {
  return provider === 'sambanova' ? SAMBANOVA_API_URL : GROQ_API_URL;
}

function getApiKey(config) {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} no configurada`);
  }
  return apiKey;
}

function buildRequestBody(config, messages, options) {
  const body = {
    model: config.modelId,
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    top_p: 0.9,
    stream: false,
  };

  if (config.provider === 'sambanova') {
    body.stream = false;
  }

  return body;
}

export async function chat(messages, options = {}) {
  const {
    temperature = 0.6,
    maxTokens = 4096,
    model = 'coach_llama',
  } = options;

  const config = getModelConfig(model);
  const apiKey = getApiKey(config);
  const apiUrl = getApiUrl(config.provider);
  const body = buildRequestBody(config, messages, { temperature, maxTokens });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI Error (${config.label}):`, response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content.trim()) {
    throw new Error('Modelo devolvio respuesta vacia');
  }

  return content;
}

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
  context += `Peso corporal actual: ${lastWeight ? `${lastWeight.weight} kg` : 'Sin registrar'}.\n`;
  context += `Sesiones ultimos 7 dias: ${recentSessions.length}.\n\n`;

  if (recentSessions.length > 0) {
    context += 'Sesiones recientes:\n';
    for (const session of recentSessions) {
      const dateStr = new Date(session.date).toISOString().slice(0, 10);
      const muscleGroup = session.didCardio && session.muscleGroup === 'Descanso'
        ? 'Descanso activo'
        : session.muscleGroup || 'Sin especificar';
      const fatigue = session.fatigueLevel ? `Fatiga: ${session.fatigueLevel}/10` : '';
      const rir = session.rirScore !== null && session.rirScore !== undefined ? `RIR: ${session.rirScore}` : '';
      const cal = session.totalCalories ? `${session.totalCalories} kcal` : '';
      const cardio = session.didCardio ? `Cardio: ${session.cardioMinutes}min ${session.cardioType || ''}`.trim() : '';

      context += `- ${dateStr}: ${muscleGroup} | ${cal} ${fatigue} ${rir} ${cardio}\n`;

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
