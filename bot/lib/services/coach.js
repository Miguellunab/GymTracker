/**
 * Servicio de Coach AI
 * Integración con Groq + SambaNova para consejos, análisis y modificación de entrenamientos
 */

import { chat, chatJSON, buildReportContext } from '../../../src/lib/nvidia-nim.js';
import prisma from '../../../src/lib/prisma.js';
import { executeCoachAction } from '../../../src/lib/coach-actions.js';
import { ensureExerciseCatalog, getRelevantExerciseContext } from '../../../src/lib/exercise-catalog.js';

/**
 * Obtiene el consejo diario del coach
 */
export async function getDailyTip() {
  try {
    await ensureExerciseCatalog(prisma);
    const context = await buildReportContext(prisma);
    const reminderContext = await getRelevantExerciseContext(prisma, 'press banca jalon prensa hack curl remo');

    const systemPrompt = `Eres un coach de gimnasio experto. Hablas español de manera directa y motivacional.
Rutina del usuario: Arnold Split (Pecho/Espalda, Pierna, Brazos) - 3 días por semana, horario flexible.
Siempre hace pierna entre los días de torso.

${context}

${reminderContext ? `Memoria de pesos recientes:\n${reminderContext}` : ''}

Da UN consejo breve y directo para hoy (2-3 oraciones máximo). Sugiere qué grupo muscular trabajar o si debe descansar.`;

    const message = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '¿Qué debería hacer hoy?' }
    ], { temperature: 0.8, maxTokens: 200, model: 'daily' });

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
    await ensureExerciseCatalog(prisma);
    const context = await buildReportContext(prisma);
    const exerciseContext = await getRelevantExerciseContext(prisma, userMessage);

    const systemPrompt = `Eres AI Coach, un entrenador personal inteligente para GymTracker.
Rutina del usuario: Arnold Split (Pecho/Espalda, Pierna, Brazos) - 3 días por semana, horario flexible.

CAPACIDADES:
- Puedes MODIFICAR entrenamientos pasados si el usuario lo pide
- Puedes ELIMINAR entrenamientos si el usuario lo solicita
- Puedes MOVER una sesion a otra fecha si el usuario se equivoco de dia
- Puedes responder cuanto levanta el usuario en un ejercicio, ultima marca y mejor marca
- Puedes responder preguntas sobre su progreso

Responde SIEMPRE en formato JSON válido:
{
  "action": "UPDATE_SESSION" | "DELETE_SESSION" | "MOVE_SESSION_DATE" | "ANSWER_EXERCISE_QUERY" | "CHAT",
  "targetDate": "YYYY-MM-DD",
  "newDate": "YYYY-MM-DD",
  "exerciseQuery": "string",
    "updates": {
      "muscleGroup": "string",
      "didCardio": boolean,
      "cardioMinutes": number,
      "totalCalories": number,
      "fatigueLevel": number,
      "rirScore": number,
      "correctionReason": "string"
  },
  "message": "Texto que verá el usuario"
}

REGLAS:
1. Si el usuario dice "cambia X a Y", "el entreno de ayer fue...", "modifica...", usa UPDATE_SESSION
2. Si dice "elimina", "borra", "quita el entreno de...", usa DELETE_SESSION
3. Si pide mover la sesion de un dia a otro, usa MOVE_SESSION_DATE
4. Si pregunta cuanto levanta en un ejercicio o su ultima marca, usa ANSWER_EXERCISE_QUERY
5. Para preguntas normales, usa CHAT
4. targetDate debe ser formato YYYY-MM-DD
5. "ayer" = fecha de ayer, "hoy" = fecha de hoy, "lunes" = último lunes, etc.
6. Siempre confirma la acción en el mensaje

CONTEXTO DEL USUARIO:
${context}

${exerciseContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: 'user', content: userMessage }
    ];

    let result;
    try {
      result = await chatJSON(messages, { temperature: 0.5, maxTokens: 500, model: 'coach_deepseek' });
    } catch (e) {
      // If JSON parsing fails, return raw response
      const rawResponse = await chat(messages, { temperature: 0.5, maxTokens: 500, model: 'coach_deepseek' });
      return rawResponse || 'No pude procesar tu mensaje.';
    }

    const execution = await executeCoachAction(prisma, result);
    return execution.finalMessage;
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
    await ensureExerciseCatalog(prisma);
    const systemPrompt = `Eres un parser de entrenamientos de gimnasio. El usuario describe su entrenamiento en texto libre.
Tu tarea es extraer la información estructurada.

El usuario sigue Arnold Split: Pecho/Espalda, Pierna, Brazos.

INSTRUCCIONES:
1. Identifica el grupo muscular principal
2. Extrae cada ejercicio con nombre, peso en kg, series y reps
3. Identifica si hizo cardio (tipo y minutos)
4. Extrae duración total en minutos
5. Extrae cómo se sintió (texto libre)
6. Genera RIR global estimado (0-5) y nivel de fatiga (1-10) basado en lo descrito
7. Estima calorías totales
8. Si el usuario describe sensaciones mixtas entre ejercicios, analiza toda la sesion completa antes de decidir. No generalices solo por la primera frase.
9. Puedes tomarte el tiempo necesario para pensar, pero responde solo con el JSON final.

RESPONDE SOLO en este formato JSON:
{
  "muscleGroup": "Pecho/Espalda" | "Pierna" | "Brazos",
  "exercises": [
    {"name": "Press de banca", "weight": 80, "sets": 3, "reps": 10}
  ],
  "didCardio": false,
  "cardioType": null,
  "cardioMinutes": 0,
  "durationMinutes": 60,
  "feeling": "Me sentí bien",
  "rirScore": 2,
  "fatigueLevel": 6,
  "totalCalories": 350,
  "notes": null
}

REGLAS:
- Para ejercicios obvios, usa la variante mas comun del gimnasio (ej: "prensa" => "Prensa de pierna en maquina", "hacka" => "Hack squat en maquina", "jalon" => "Jalon al pecho en polea")
- Si un ejercicio es ambiguo entre variantes, NO inventes el equipamiento. Devuelve el nombre base ambiguo (ej: "Press de banca", "Press inclinado", "Curl de biceps", "Remo")
- Si no especifica series, asume 3
- Si no especifica reps, asume 10
- Infiere grupo muscular por los ejercicios si no lo dice explícitamente`;

    const result = await chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ], { temperature: 0.2, maxTokens: 700, model: 'analysis' });

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
    ], { temperature: 0.7, maxTokens: 200, model: 'coach_llama' });

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
