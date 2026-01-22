import { Groq } from 'groq-sdk';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function getMode(request) {
  if (!request.cookies) {
    return 'main';
  }
  return request.cookies.get('app_mode')?.value ?? 'main';
}

async function buildCoachContext(prisma) {
  const now = new Date();
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 14);

  const start60 = new Date(now);
  start60.setDate(start60.getDate() - 60);

  const [sessionsLast7, lastSession, recentMax, prevMax, sessionsLast60] = await Promise.all([
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
      where: { date: { gte: start60 } },
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
    sessionsLast60.map((s) => [new Date(s.date).toISOString().slice(0, 10), s])
  );
  const calendarLines = [];
  for (let i = 0; i <= 60; i += 1) {
    const day = new Date(start60);
    day.setDate(start60.getDate() + i);
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
    'Calendario últimos 60 días:',
    ...calendarLines
  ].join('\n');
}

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response('Missing GROQ_API_KEY', { status: 500 });
  }

  let messages;
  try {
    const body = await request.json();
    messages = body.messages;
  } catch (e) {
    return new Response('Invalid JSON payload', { status: 400 });
  }

  if (!Array.isArray(messages)) {
    return new Response('Invalid messages payload', { status: 400 });
  }

  const prisma = getPrisma(getMode(request));
  const coachContext = await buildCoachContext(prisma);
  
  const systemMessage = {
    role: 'system',
    content: `Eres AI Coach, un entrenador personal inteligente.

    
Objective: Ayudar al usuario y, si es necesario, actualizar sus registros de entrenamiento.
Responde SIEMPRE en formato JSON válido.

Estructura JSON requerida:
{
  "action": "UPDATE_SESSION" | "DELETE_SESSION" | "CHAT",
  "targetDate": "YYYY-MM-DD", (Obligatorio si action es UPDATE_SESSION o DELETE_SESSION)
  "updates": {
     "routineName": string, (Opcional, para cambiar la categoría/nombre de la rutina)
     "didCardio": boolean, (Opcional)
     "cardioMinutes": number, (Opcional)
     "totalCalories": number, (Opcional)
     "durationSeconds": number, (Opcional)
     "correctionReason": string (Breve explicación del cambio)
  }, (Obligatorio si action es UPDATE_SESSION)
  "message": "Texto de respuesta que leerá el usuario."
}

Reglas de Negocio:
1. Detectar Intención: 
   - Si el usuario dice "cambia la rutina de ayer a Pierna" o "fue pecho no espalda", usa "action": "UPDATE_SESSION" con "routineName".
   - Si el usuario dice "elimina el entreno de hoy" o "borra el registro del lunes", usa "action": "DELETE_SESSION".
   - Si menciona cambios en cardio/tiempo, usa UPDATE_SESSION con los campos respectivos.
2. Cálculo de Calorías: Si agregas cardio, calcula calorías realistas (aprox 8-10 kcal/min para intensidad media).
3. Validación: Si el usuario pide modificar una fecha futura, usa "action": "CHAT" y explica el error.
4. Solo Chat: Si es una pregunta general, usa "action": "CHAT".
5. Persistencia: Tu corrección se guardará en las notas de la sesión.

Contexto del usuario:
${coachContext}`
  };

  const fullMessages = [systemMessage, ...messages];

  const groq = new Groq({ apiKey });

  try {
    // 1. Generate JSON response from LLM
    const completion = await groq.chat.completions.create({
      messages: fullMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_completion_tokens: 4096,
      top_p: 1,
      response_format: { type: 'json_object' },
      stream: false
    });

    const content = completion.choices[0]?.message?.content;
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse JSON from AI:', content);
      result = { action: 'CHAT', message: content || 'Hubo un error procesando tu solicitud.' };
    }

    let finalMessage = result.message;

    // 2. Execute Action if requested
    if ((result.action === 'UPDATE_SESSION' || result.action === 'DELETE_SESSION') && result.targetDate) {
      const startOfDay = new Date(result.targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(result.targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingSession = await prisma.workoutSession.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      if (existingSession) {
        if (result.action === 'DELETE_SESSION') {
             await prisma.workoutSession.delete({
                 where: { id: existingSession.id }
             });
             // finalMessage is already set by AI, typically "Entrenamiento eliminado correctamente."
        } else {
            // UPDATE_SESSION
            const updateData = {};
            if (result.updates.routineName !== undefined) updateData.routineName = result.updates.routineName;
            if (result.updates.didCardio !== undefined) updateData.didCardio = result.updates.didCardio;
            if (result.updates.cardioMinutes !== undefined) updateData.cardioMinutes = result.updates.cardioMinutes;
            if (result.updates.totalCalories !== undefined) updateData.totalCalories = result.updates.totalCalories;
            if (result.updates.durationSeconds !== undefined) updateData.durationSeconds = result.updates.durationSeconds;
            
            // Append context note
            const newNote = `[AI Correction: ${result.updates.correctionReason || 'Manual update'}]`;
            updateData.notes = existingSession.notes 
              ? `${existingSession.notes}\n${newNote}`
              : newNote;
    
            await prisma.workoutSession.update({
              where: { id: existingSession.id },
              data: updateData
            });
        }
        
      } else {
        finalMessage = `No encontré una sesión registrada para el ${result.targetDate}.`;
      }
    }

    // 3. Stream the text response back to client

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(finalMessage));
        controller.close();
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('Coach API Error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
