import { Groq } from 'groq-sdk';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function getMode(request) {
  return request.cookies?.get('app_mode')?.value ?? 'main';
}


async function buildCoachContext(prisma) {
  const now = new Date();
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 14);

  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);

  const [sessionsLast7, lastSession, recentMax, prevMax, sessionsLast30] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { date: { gte: start7 } },
      select: { date: true, didCardio: true, routineName: true }
    }),
    prisma.workoutSession.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, routineName: true, didCardio: true, cardioMinutes: true }
    }),
    prisma.workoutSet.groupBy({
      by: ['exerciseId'],
      where: { session: { date: { gte: start7 } } },
      _max: { weight: true }
    }),
    prisma.workoutSet.groupBy({
      by: ['exerciseId'],
      where: { session: { date: { gte: start14, lt: start7 } } },
      _max: { weight: true }
    }),
    prisma.workoutSession.findMany({
      where: { date: { gte: start30 } },
      orderBy: { date: 'asc' },
      select: { date: true, routineName: true, didCardio: true }
    })
  ]);

  const cardioSessions = sessionsLast7.filter((s) => s.didCardio).length;
  const trainedThisWeek = sessionsLast7.length > 0;

  const prevMap = new Map(prevMax.map((row) => [row.exerciseId, row._max.weight ?? 0]));
  const improvedIds = recentMax
    .filter((row) => (row._max.weight ?? 0) > (prevMap.get(row.exerciseId) ?? 0))
    .map((row) => row.exerciseId)
    .slice(0, 3);

  let improvedNames = [];
  if (improvedIds.length) {
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: improvedIds } },
      select: { id: true, name: true }
    });
    const nameMap = new Map(exercises.map((e) => [e.id, e.name]));
    improvedNames = improvedIds.map((id) => nameMap.get(id)).filter(Boolean);
  }

  const progressLine = improvedNames.length
    ? `Progreso reciente: mejoras en ${improvedNames.join(', ')}.`
    : recentMax.length
      ? 'Progreso reciente: sin mejoras registradas en los últimos 7 días.'
      : 'Progreso reciente: sin datos suficientes para evaluar.';

  const lastSessionLine = lastSession
    ? `Última sesión: ${new Date(lastSession.date).toISOString().slice(0, 10)} (${lastSession.routineName ?? 'Rutina sin nombre'}).`
    : 'Última sesión: no hay registros.';

  const cardioLine = trainedThisWeek
    ? `Cardio últimos 7 días: ${cardioSessions} sesiones.`
    : 'Cardio últimos 7 días: sin sesiones registradas.';

  const sessionMap = new Map(
    sessionsLast30.map((s) => [new Date(s.date).toISOString().slice(0, 10), s])
  );
  const calendarLines = [];
  for (let i = 0; i <= 30; i += 1) {
    const day = new Date(start30);
    day.setDate(start30.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString('es-ES', { weekday: 'long' });
    const entry = sessionMap.get(dateStr);
    const title = entry?.routineName ?? 'Sin sesión';
    const cardioTag = entry?.didCardio ? ' (cardio)' : '';
    calendarLines.push(`${dateStr} (${label}): ${title}${cardioTag}`);
  }

  return [
    `Fecha actual: ${now.toISOString().slice(0, 10)}.`,
    `Sesiones últimos 7 días: ${sessionsLast7.length}.`,
    trainedThisWeek ? 'Entrenaste en la última semana: sí.' : 'Entrenaste en la última semana: no.',
    cardioLine,
    lastSessionLine,
    progressLine,
    'Calendario últimos 30 días:',
    ...calendarLines
  ].join('\n');
}

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response('Missing GROQ_API_KEY', { status: 500 });
  }

  const { messages } = await request.json();
  if (!Array.isArray(messages)) {
    return new Response('Invalid messages payload', { status: 400 });
  }

  const prisma = getPrisma(getMode(request));
  const coachContext = await buildCoachContext(prisma);
  const systemMessage = {
    role: 'system',
    content: `Eres AI Coach, un entrenador personal claro, empático y directo. Siempre respondes en español. Tu objetivo es motivar, corregir y sugerir ajustes prácticos.

Reglas:
- Usa el calendario del contexto para responder preguntas sobre días específicos.
- Si te preguntan por una fecha, busca esa fecha exacta en el calendario (YYYY-MM-DD) y responde con lo que dice ahí.
- Si no hay sesión registrada, dilo explícitamente.

Contexto del atleta:
${coachContext}`
  };

  const fullMessages = [systemMessage, ...messages];

  const groq = new Groq({ apiKey });
  const encoder = new TextEncoder();
  const stream = await groq.chat.completions.create({
    messages: fullMessages,
    model: 'moonshotai/kimi-k2-instruct-0905',
    temperature: 0.6,
    max_completion_tokens: 4096,
    top_p: 1,
    stream: true
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
