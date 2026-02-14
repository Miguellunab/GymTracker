/**
 * Cliente centralizado para NVIDIA NIM API (Kimi K2.5)
 * Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 * Modelo: moonshotai/kimi-k2-5
 */

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2-5';

/**
 * Llamada base al modelo Kimi K2.5 via NVIDIA NIM
 * @param {Array} messages - Array de mensajes [{role, content}]
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<string>} - Contenido de la respuesta
 */
export async function chat(messages, options = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY no configurada');
  }

  const {
    temperature = 0.6,
    maxTokens = 4096,
    jsonMode = false,
  } = options;

  const body = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
    stream: false,
  };

  // NVIDIA NIM soporta response_format para JSON mode
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('NVIDIA NIM Error:', response.status, errorText);
    throw new Error(`NVIDIA NIM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Chat con respuesta JSON parseada
 * @param {Array} messages - Array de mensajes
 * @param {Object} options - Opciones (sin jsonMode, se activa auto)
 * @returns {Promise<Object>} - Objeto JSON parseado
 */
export async function chatJSON(messages, options = {}) {
  const content = await chat(messages, { ...options, jsonMode: true });
  
  try {
    // Limpiar posibles markdown wrappers
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Error parseando JSON de NVIDIA NIM:', content);
    throw new Error('Respuesta no es JSON valido');
  }
}

/**
 * Genera un system prompt con contexto de reportes semanales
 * @param {Object} prisma - Instancia de Prisma
 * @returns {Promise<string>} - Contexto formateado
 */
export async function buildReportContext(prisma) {
  const now = new Date();
  
  // Obtener ISO week number
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

  // Buscar reportes semanales: actual y anterior
  const [currentReport, previousReport] = await Promise.all([
    prisma.weeklyReport.findUnique({
      where: { weekNumber_year: { weekNumber: currentWeek, year: currentYear } }
    }).catch(() => null),
    prisma.weeklyReport.findUnique({
      where: { weekNumber_year: { weekNumber: prevWeek, year: prevYear } }
    }).catch(() => null),
  ]);

  // Obtener sesiones de los ultimos 7 dias para datos frescos
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);

  const recentSessions = await prisma.workoutSession.findMany({
    where: { date: { gte: start7 } },
    orderBy: { date: 'desc' },
    include: {
      sets: true,
    }
  });

  // Obtener ultimo peso corporal
  const lastWeight = await prisma.weightLog.findFirst({
    orderBy: { date: 'desc' }
  });

  let context = `Fecha actual: ${now.toISOString().slice(0, 10)}.\n`;
  context += `Peso corporal actual: ${lastWeight ? lastWeight.weight + ' kg' : 'Sin registrar'}.\n`;
  context += `Sesiones ultimos 7 dias: ${recentSessions.length}.\n\n`;

  // Datos frescos de sesiones recientes
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
      
      // Incluir pesos por ejercicio
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

export default { chat, chatJSON, buildReportContext };
