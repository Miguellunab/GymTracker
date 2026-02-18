import { chatJSON, buildReportContext } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';

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
{"action": "UPDATE_SESSION" | "DELETE_SESSION" | "UPDATE_EXERCISES" | "CHAT", "targetDate": "YYYY-MM-DD", "updates": {...}, "message": "Texto de respuesta que leera el usuario."}

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

Reglas:
1. Si el usuario pide corregir datos de una sesion (ej: "fue pierna no brazos"), usa UPDATE_SESSION.
2. Si el usuario pide eliminar una sesion, usa DELETE_SESSION.
3. Si el usuario pide cambiar nombres de ejercicios, corregir peso/series/reps, agregar o quitar ejercicios, usa UPDATE_EXERCISES.
4. Si es solo conversacion, usa CHAT.
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

    let finalMessage = result.message || 'No tengo respuesta en este momento.';

    // Execute DB action if requested
    if (result.targetDate && ['UPDATE_SESSION', 'DELETE_SESSION', 'UPDATE_EXERCISES'].includes(result.action)) {
      const startOfDay = new Date(result.targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(result.targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingSession = await prisma.workoutSession.findFirst({
        where: {
          date: { gte: startOfDay, lte: endOfDay }
        },
        include: { sets: true }
      });

      if (existingSession) {
        if (result.action === 'DELETE_SESSION') {
          await prisma.workoutSession.delete({
            where: { id: existingSession.id }
          });

        } else if (result.action === 'UPDATE_SESSION') {
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

        } else if (result.action === 'UPDATE_EXERCISES') {
          const ops = result.exerciseUpdates || [];
          for (const op of ops) {
            switch (op.type) {
              case 'rename': {
                // Find the set by name (case-insensitive)
                const setToRename = existingSession.sets.find(
                  s => s.exerciseName.toLowerCase() === (op.oldName || '').toLowerCase()
                );
                if (setToRename) {
                  await prisma.workoutSet.update({
                    where: { id: setToRename.id },
                    data: { exerciseName: op.newName }
                  });
                }
                break;
              }
              case 'update': {
                // Find and update weight/sets/reps
                const setToUpdate = existingSession.sets.find(
                  s => s.exerciseName.toLowerCase() === (op.exerciseName || '').toLowerCase()
                );
                if (setToUpdate) {
                  const updateFields = {};
                  if (op.weight !== undefined) updateFields.weight = parseFloat(op.weight);
                  if (op.sets !== undefined) updateFields.sets = parseInt(op.sets);
                  if (op.reps !== undefined) updateFields.reps = parseInt(op.reps);
                  if (op.newName) updateFields.exerciseName = op.newName;
                  await prisma.workoutSet.update({
                    where: { id: setToUpdate.id },
                    data: updateFields
                  });
                }
                break;
              }
              case 'add': {
                await prisma.workoutSet.create({
                  data: {
                    workoutSessionId: existingSession.id,
                    exerciseName: op.exerciseName || 'Ejercicio',
                    weight: parseFloat(op.weight) || 0,
                    sets: parseInt(op.sets) || 3,
                    reps: parseInt(op.reps) || 10,
                  }
                });
                break;
              }
              case 'delete': {
                const setToDelete = existingSession.sets.find(
                  s => s.exerciseName.toLowerCase() === (op.exerciseName || '').toLowerCase()
                );
                if (setToDelete) {
                  await prisma.workoutSet.delete({
                    where: { id: setToDelete.id }
                  });
                }
                break;
              }
            }
          }

          // Add note about exercise updates
          const note = `[AI: Ejercicios modificados - ${ops.map(o => o.type).join(', ')}]`;
          await prisma.workoutSession.update({
            where: { id: existingSession.id },
            data: {
              notes: existingSession.notes
                ? `${existingSession.notes}\n${note}`
                : note
            }
          });
        }
      } else {
        finalMessage = `No encontre una sesion registrada para el ${result.targetDate}.`;
      }
    }

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
        'X-Coach-Action': result.action || 'CHAT'
      }
    });

  } catch (error) {
    console.error('Coach API Error:', error?.message || error);
    return new Response('Error procesando tu mensaje. Intenta de nuevo.', { status: 500 });
  }
}
