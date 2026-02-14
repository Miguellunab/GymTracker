import { chat, chatJSON, buildReportContext } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request) {
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

  try {
    const reportContext = await buildReportContext(prisma);

    const systemMessage = {
      role: 'system',
      content: `Eres AI Coach, un entrenador personal inteligente para un usuario que sigue Arnold Split (Pecho/Espalda, Pierna, Brazos) 3 dias por semana.

Objetivo: Ayudar al usuario y, si es necesario, actualizar sus registros de entrenamiento.
Responde SIEMPRE en formato JSON valido.

Estructura JSON requerida:
{
  "action": "UPDATE_SESSION" | "DELETE_SESSION" | "CHAT",
  "targetDate": "YYYY-MM-DD",
  "updates": {
    "muscleGroup": string,
    "didCardio": boolean,
    "cardioType": string,
    "cardioMinutes": number,
    "totalCalories": number,
    "durationMinutes": number,
    "fatigueLevel": number,
    "nitRating": number,
    "correctionReason": string
  },
  "message": "Texto de respuesta que leera el usuario."
}

Reglas:
1. Si el usuario pide corregir datos de una sesion (ej: "fue pierna no brazos"), usa UPDATE_SESSION con targetDate y los campos a cambiar.
2. Si el usuario pide eliminar una sesion, usa DELETE_SESSION con targetDate.
3. Si es solo conversacion, usa CHAT (targetDate y updates son opcionales).
4. No modifiques fechas futuras - responde con CHAT explicando el error.
5. Se directo, conciso, en espanol. Maximo 3 frases en message.
6. Si el usuario no ha entrenado en 3+ dias, motivalo con urgencia.
7. Usa el contexto de reportes para dar respuestas informadas sobre progreso.

Contexto del usuario:
${reportContext}`
    };

    const fullMessages = [systemMessage, ...messages];

    const result = await chatJSON(fullMessages, { temperature: 0.5, maxTokens: 1024 });

    let finalMessage = result.message || 'No tengo respuesta en este momento.';

    // Execute DB action if requested
    if ((result.action === 'UPDATE_SESSION' || result.action === 'DELETE_SESSION') && result.targetDate) {
      const startOfDay = new Date(result.targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(result.targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingSession = await prisma.workoutSession.findFirst({
        where: {
          date: { gte: startOfDay, lte: endOfDay }
        }
      });

      if (existingSession) {
        if (result.action === 'DELETE_SESSION') {
          await prisma.workoutSession.delete({
            where: { id: existingSession.id }
          });
        } else {
          // UPDATE_SESSION
          const updateData = {};
          const u = result.updates || {};
          if (u.muscleGroup !== undefined) updateData.muscleGroup = u.muscleGroup;
          if (u.didCardio !== undefined) updateData.didCardio = u.didCardio;
          if (u.cardioType !== undefined) updateData.cardioType = u.cardioType;
          if (u.cardioMinutes !== undefined) updateData.cardioMinutes = u.cardioMinutes;
          if (u.totalCalories !== undefined) updateData.totalCalories = u.totalCalories;
          if (u.durationMinutes !== undefined) updateData.durationMinutes = u.durationMinutes;
          if (u.fatigueLevel !== undefined) updateData.fatigueLevel = u.fatigueLevel;
          if (u.nitRating !== undefined) updateData.nitRating = u.nitRating;

          const note = `[AI: ${u.correctionReason || 'Correccion manual'}]`;
          updateData.notes = existingSession.notes
            ? `${existingSession.notes}\n${note}`
            : note;

          await prisma.workoutSession.update({
            where: { id: existingSession.id },
            data: updateData
          });
        }
      } else {
        finalMessage = `No encontre una sesion registrada para el ${result.targetDate}.`;
      }
    }

    // Return text response
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
