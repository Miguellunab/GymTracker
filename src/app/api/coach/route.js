import { chatJSON, buildReportContext } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';
import { executeCoachAction } from '@/lib/coach-actions';

export const runtime = 'nodejs';

export async function POST(request) {
  let messages, aiModel;
  try {
    const body = await request.json();
    messages = body.messages;
    aiModel = body.model || 'fast';
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
Responde SIEMPRE en formato JSON valido sin markdown.

Estructura JSON requerida:
{"action": "UPDATE_SESSION" | "DELETE_SESSION" | "UPDATE_EXERCISES" | "MOVE_SESSION_DATE" | "ANSWER_EXERCISE_QUERY" | "CHAT", "targetDate": "YYYY-MM-DD", "newDate": "YYYY-MM-DD", "exerciseQuery": "string", "updates": {...}, "message": "Texto de respuesta que leera el usuario."}

Acciones disponibles:

1. UPDATE_SESSION — Modificar datos generales de una sesion:
   {"action": "UPDATE_SESSION", "targetDate": "YYYY-MM-DD", "updates": {"muscleGroup": "string", "didCardio": true/false, "cardioType": "string", "cardioMinutes": 0, "totalCalories": 0, "durationMinutes": 0, "fatigueLevel": 0, "nitRating": 0, "correctionReason": "string"}, "message": "..."}

2. DELETE_SESSION — Eliminar una sesion completa:
   {"action": "DELETE_SESSION", "targetDate": "YYYY-MM-DD", "message": "..."}

3. UPDATE_EXERCISES — Modificar, agregar o eliminar ejercicios individuales de una sesion:
   {"action": "UPDATE_EXERCISES", "targetDate": "YYYY-MM-DD", "exerciseUpdates": [
     {"type": "rename", "oldName": "nombre actual", "newName": "nombre correcto"},
     {"type": "update", "exerciseName": "nombre", "weight": 80, "sets": 4, "reps": 10},
     {"type": "add", "exerciseName": "nombre", "weight": 0, "sets": 3, "reps": 10},
     {"type": "delete", "exerciseName": "nombre a eliminar"}
   ], "message": "..."}

4. CHAT — Solo conversacion, sin modificar datos:
   {"action": "CHAT", "message": "..."}

5. MOVE_SESSION_DATE — Mover una sesion a otra fecha:
   {"action": "MOVE_SESSION_DATE", "targetDate": "YYYY-MM-DD", "newDate": "YYYY-MM-DD", "reason": "string", "message": "..."}

6. ANSWER_EXERCISE_QUERY — Responder cuanto levanta en un ejercicio o su ultimo registro:
   {"action": "ANSWER_EXERCISE_QUERY", "exerciseQuery": "nombre del ejercicio consultado", "message": "..."}

Reglas:
1. Si el usuario pide corregir datos de una sesion (ej: "fue pierna no brazos"), usa UPDATE_SESSION.
2. Si el usuario pide eliminar una sesion, usa DELETE_SESSION.
3. Si el usuario pide cambiar nombres de ejercicios, corregir peso/series/reps, agregar o quitar ejercicios, usa UPDATE_EXERCISES.
4. Si es solo conversacion, usa CHAT.
4.1. Si pide mover una sesion de un dia a otro, usa MOVE_SESSION_DATE.
4.2. Si pregunta cuanto levanta en un ejercicio, cual fue su ultimo peso o su mejor marca, usa ANSWER_EXERCISE_QUERY.
5. No modifiques fechas futuras.
6. Se directo, conciso, en espanol. Maximo 3 frases en message.
7. Si el usuario no ha entrenado en 3+ dias, motivalo.
8. Usa el contexto de reportes para respuestas informadas.
9. Cuando uses UPDATE_EXERCISES, confirma EN TU MENSAJE los cambios exactos que hiciste (ej: "Cambie 'sentadilla hacka' a 'Hack squat en maquina'").
10. Para renombrar ejercicios, el campo "oldName" debe coincidir EXACTAMENTE con el nombre actual en la base de datos (case-insensitive).

Contexto del usuario:
${reportContext}`
    };

    const fullMessages = [systemMessage, ...messages];

    const result = await chatJSON(fullMessages, { temperature: 0.5, maxTokens: 1024, model: aiModel });

    const execution = await executeCoachAction(prisma, result);
    const finalMessage = execution.finalMessage;

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
        'Cache-Control': 'no-store',
        'X-Coach-Action': execution.action || result.action || 'CHAT'
      }
    });

  } catch (error) {
    console.error('Coach API Error:', error?.message || error);
    return new Response('Error procesando tu mensaje. Intenta de nuevo.', { status: 500 });
  }
}
