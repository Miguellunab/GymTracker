/**
 * Servicio de Coach AI
 * Integración con NVIDIA NIM (Kimi K2.5) para consejos, análisis y modificación de entrenamientos
 */

import { chat, chatJSON, buildReportContext } from '../../../src/lib/nvidia-nim.js';
import prisma from '../../../src/lib/prisma.js';

/**
 * Obtiene el consejo diario del coach
 */
export async function getDailyTip() {
  try {
    const context = await buildReportContext(prisma);

    const systemPrompt = `Eres un coach de gimnasio experto. Hablas español de manera directa y motivacional.
Rutina del usuario: Arnold Split (Pecho/Espalda, Pierna, Brazos) - 3 días por semana, horario flexible.
Siempre hace pierna entre los días de torso.

${context}

Da UN consejo breve y directo para hoy (2-3 oraciones máximo). Sugiere qué grupo muscular trabajar o si debe descansar.`;

    const message = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '¿Qué debería hacer hoy?' }
    ], { temperature: 0.8, maxTokens: 200 });

    let action = 'Entreno';
    const lower = message.toLowerCase();
    if (lower.includes('descanso') || lower.includes('recupera')) {
      action = 'Descanso';
    } else if (lower.includes('pecho') || lower.includes('espalda')) {
      action = 'Pecho/Espalda';
    } else if (lower.includes('pierna')) {
      action = 'Pierna';
    } else if (lower.includes('brazo')) {
      action = 'Brazos';
    }

    return { message, action };
  } catch (error) {
    console.error('Error getting daily tip:', error);
    return {
      message: 'No pude conectar con el coach. ¡Entrena lo que sientas!',
      action: 'Error'
    };
  }
}

/**
 * Chat conversacional con el coach - CON PERMISOS DE EDICIÓN/ELIMINACIÓN
 */
export async function chatWithCoach(userMessage, conversationHistory = []) {
  try {
    const context = await buildReportContext(prisma);

    const systemPrompt = `Eres AI Coach, un entrenador personal inteligente para GymTracker.
Rutina del usuario: Arnold Split (Pecho/Espalda, Pierna, Brazos) - 3 días por semana, horario flexible.

CAPACIDADES:
- Puedes MODIFICAR entrenamientos pasados si el usuario lo pide
- Puedes ELIMINAR entrenamientos si el usuario lo solicita
- Puedes responder preguntas sobre su progreso

Responde SIEMPRE en formato JSON válido:
{
  "action": "UPDATE_SESSION" | "DELETE_SESSION" | "CHAT",
  "targetDate": "YYYY-MM-DD",
  "updates": {
    "muscleGroup": "string",
    "didCardio": boolean,
    "cardioMinutes": number,
    "totalCalories": number,
    "fatigueLevel": number,
    "nitRating": number,
    "correctionReason": "string"
  },
  "message": "Texto que verá el usuario"
}

REGLAS:
1. Si el usuario dice "cambia X a Y", "el entreno de ayer fue...", "modifica...", usa UPDATE_SESSION
2. Si dice "elimina", "borra", "quita el entreno de...", usa DELETE_SESSION
3. Para preguntas normales, usa CHAT
4. targetDate debe ser formato YYYY-MM-DD
5. "ayer" = fecha de ayer, "hoy" = fecha de hoy, "lunes" = último lunes, etc.
6. Siempre confirma la acción en el mensaje

CONTEXTO DEL USUARIO:
${context}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: 'user', content: userMessage }
    ];

    let result;
    try {
      result = await chatJSON(messages, { temperature: 0.5, maxTokens: 500 });
    } catch (e) {
      // If JSON parsing fails, return raw response
      const rawResponse = await chat(messages, { temperature: 0.5, maxTokens: 500 });
      return rawResponse || 'No pude procesar tu mensaje.';
    }

    let finalMessage = result.message || 'Procesado.';

    // Execute action if needed
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
          await prisma.workoutSet.deleteMany({
            where: { workoutSessionId: existingSession.id }
          });
          await prisma.workoutSession.delete({
            where: { id: existingSession.id }
          });
          finalMessage = result.message || `Entrenamiento del ${result.targetDate} eliminado.`;
        } else {
          const updateData = {};
          if (result.updates?.muscleGroup !== undefined) updateData.muscleGroup = result.updates.muscleGroup;
          if (result.updates?.didCardio !== undefined) updateData.didCardio = result.updates.didCardio;
          if (result.updates?.cardioMinutes !== undefined) updateData.cardioMinutes = result.updates.cardioMinutes;
          if (result.updates?.totalCalories !== undefined) updateData.totalCalories = result.updates.totalCalories;
          if (result.updates?.fatigueLevel !== undefined) updateData.fatigueLevel = result.updates.fatigueLevel;
          if (result.updates?.nitRating !== undefined) updateData.nitRating = result.updates.nitRating;

          const note = `[AI: ${result.updates?.correctionReason || 'Modificado via Telegram'}]`;
          updateData.notes = existingSession.notes
            ? `${existingSession.notes}\n${note}`
            : note;

          await prisma.workoutSession.update({
            where: { id: existingSession.id },
            data: updateData
          });
          finalMessage = result.message || `Entrenamiento del ${result.targetDate} actualizado.`;
        }
      } else {
        finalMessage = `No encontré un entrenamiento registrado para el ${result.targetDate}.`;
      }
    }

    return finalMessage;
  } catch (error) {
    console.error('Error chatting with coach:', error);
    return 'Error al conectar con el coach. Intenta de nuevo.';
  }
}

/**
 * Parsea texto libre de entrenamiento usando AI
 */
export async function parseWorkoutText(text) {
  try {
    const systemPrompt = `Eres un parser de entrenamientos de gimnasio. El usuario describe su entrenamiento en texto libre.
Tu tarea es extraer la información estructurada.

El usuario sigue Arnold Split: Pecho/Espalda, Pierna, Brazos.

INSTRUCCIONES:
1. Identifica el grupo muscular principal
2. Extrae cada ejercicio con nombre, peso en kg, series y reps
3. Identifica si hizo cardio (tipo y minutos)
4. Extrae duración total en minutos
5. Extrae cómo se sintió (texto libre)
6. Genera NIT rating (1-10, intensidad) y nivel de fatiga (1-10) basado en lo descrito
7. Estima calorías totales

RESPONDE SOLO en este formato JSON:
{
  "muscleGroup": "Pecho/Espalda" | "Pierna" | "Brazos",
  "exercises": [
    {"name": "Press de banca con barra", "weight": 80, "sets": 3, "reps": 10}
  ],
  "didCardio": false,
  "cardioType": null,
  "cardioMinutes": 0,
  "durationMinutes": 60,
  "feeling": "Me sentí bien",
  "nitRating": 7,
  "fatigueLevel": 6,
  "totalCalories": 350,
  "notes": null
}

REGLAS:
- Normaliza nombres de ejercicios (ej: "press banca" → "Press de banca con barra")
- Si no especifica series, asume 3
- Si no especifica reps, asume 10
- Infiere grupo muscular por los ejercicios si no lo dice explícitamente`;

    const result = await chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ], { temperature: 0.3, maxTokens: 600 });

    return result;
  } catch (error) {
    console.error('Error parsing workout text:', error);
    return null;
  }
}

/**
 * Analiza un workout y da feedback breve
 */
export async function analyzeWorkout(workoutData) {
  try {
    const { muscleGroup, exercises, durationMinutes, totalCalories, didCardio, cardioMinutes, cardioType } = workoutData;

    const exerciseList = (exercises || []).map(e => `${e.name}: ${e.weight}kg ${e.sets}x${e.reps}`).join('\n');

    const systemPrompt = `Eres un coach de gimnasio. Analiza este entrenamiento y da feedback breve (2-3 oraciones).

ENTRENAMIENTO:
- Grupo: ${muscleGroup}
- Ejercicios:
${exerciseList}
- Duración: ${durationMinutes} minutos
- Calorías: ${totalCalories}
- Cardio: ${didCardio ? `${cardioType || 'Sí'} ${cardioMinutes} min` : 'No'}

Da una valoración honesta. Si fue buen entrenamiento, felicita. Si fue corto/poco intenso, sugiere mejoras.`;

    const response = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Analiza mi entrenamiento' }
    ], { temperature: 0.7, maxTokens: 200 });

    return response || '¡Buen trabajo!';
  } catch (error) {
    console.error('Error analyzing workout:', error);
    return '¡Buen entrenamiento! Sigue así.';
  }
}

export default {
  getDailyTip,
  chatWithCoach,
  parseWorkoutText,
  analyzeWorkout,
};
