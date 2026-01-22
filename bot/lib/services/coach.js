/**
 * Servicio de Coach AI
 * Integración con Groq para consejos, análisis y MODIFICACIÓN de entrenamientos
 */

import Groq from 'groq-sdk';
import { getPrisma } from '../../../src/lib/prisma.js';

const prisma = getPrisma();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'llama-3.3-70b-versatile';

// Zona horaria Colombia
const TIMEZONE = 'America/Bogota';

/**
 * Obtiene fecha actual en Colombia
 */
function getColombiaDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Formatea fecha para display
 */
function formatDate(date) {
  return date.toLocaleDateString('es-CO', { timeZone: TIMEZONE });
}

/**
 * Construye contexto del coach (similar a la web)
 */
async function buildCoachContext() {
  const now = getColombiaDate();
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  const start60 = new Date(now);
  start60.setDate(start60.getDate() - 60);

  const [sessionsLast7, lastSession, sessionsLast60] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { date: { gte: start7 } },
      select: { date: true, didCardio: true, routineName: true }
    }),
    prisma.workoutSession.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, routineName: true, didCardio: true, cardioMinutes: true }
    }),
    prisma.workoutSession.findMany({
      where: { date: { gte: start60 } },
      orderBy: { date: 'asc' },
      select: { date: true, routineName: true, didCardio: true }
    })
  ]);

  const cardioSessions = sessionsLast7.filter((s) => s.didCardio).length;

  const lastSessionLine = lastSession
    ? `Última sesión: ${new Date(lastSession.date).toISOString().slice(0, 10)} (${lastSession.routineName ?? 'Sin nombre'}).`
    : 'Última sesión: no hay registros.';

  const sessionMap = new Map(
    sessionsLast60.map((s) => [new Date(s.date).toISOString().slice(0, 10), s])
  );
  
  const calendarLines = [];
  for (let i = 0; i <= 60; i += 1) {
    const day = new Date(start60);
    day.setDate(start60.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString('es-CO', { weekday: 'long', timeZone: TIMEZONE });
    const entry = sessionMap.get(dateStr);
    const title = entry?.routineName ?? 'Sin sesión';
    const cardioTag = entry?.didCardio ? ' (cardio)' : '';
    calendarLines.push(`${dateStr} (${label}): ${title}${cardioTag}`);
  }

  return [
    `Fecha actual (Colombia): ${now.toISOString().slice(0, 10)}.`,
    `Sesiones últimos 7 días: ${sessionsLast7.length}.`,
    `Cardio últimos 7 días: ${cardioSessions} sesiones.`,
    lastSessionLine,
    'Calendario últimos 60 días:',
    ...calendarLines
  ].join('\n');
}

/**
 * Obtiene el consejo diario del coach
 */
export async function getDailyTip() {
  try {
    const recentWorkouts = await prisma.workoutSession.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      select: {
        date: true,
        routineName: true,
        durationSeconds: true,
        totalCalories: true,
        didCardio: true
      }
    });
    
    const today = getColombiaDate();
    today.setHours(0, 0, 0, 0);
    const trainedToday = recentWorkouts.some(w => {
      const workoutDate = new Date(w.date);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === today.getTime() && w.routineName !== 'Descanso';
    });
    
    if (trainedToday) {
      return {
        message: 'Ya entrenaste hoy. Enfócate en la recuperación: buena alimentación, hidratación y descanso.',
        action: 'Recuperacion'
      };
    }
    
    const consecutiveDays = countConsecutiveTrainingDays(recentWorkouts);
    const lastRoutines = recentWorkouts
      .filter(w => w.routineName !== 'Descanso')
      .slice(0, 3)
      .map(w => w.routineName);
    
    const systemPrompt = `Eres un coach de gimnasio experto. Analiza el historial del usuario y da UN consejo breve y directo para hoy.

Historial reciente:
${recentWorkouts.map(w => `- ${formatDate(new Date(w.date))}: ${w.routineName}`).join('\n')}

Días consecutivos entrenando: ${consecutiveDays}
Últimas rutinas: ${lastRoutines.join(', ') || 'Ninguna'}

Responde en español, máximo 2-3 oraciones. Sugiere una rutina específica o descanso según corresponda.`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '¿Qué debería hacer hoy?' }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    const message = response.choices[0]?.message?.content || 'No pude generar un consejo.';
    
    let action = 'Entreno';
    if (message.toLowerCase().includes('descanso') || message.toLowerCase().includes('recupera')) {
      action = 'Descanso';
    } else {
      const routines = ['Pecho', 'Espalda', 'Pierna', 'Brazos', 'Cuadriceps', 'Femoral'];
      for (const r of routines) {
        if (message.toLowerCase().includes(r.toLowerCase())) {
          action = r;
          break;
        }
      }
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
    const coachContext = await buildCoachContext();
    
    const systemPrompt = `Eres AI Coach, un entrenador personal inteligente para GymTracker.

CAPACIDADES:
- Puedes MODIFICAR entrenamientos pasados si el usuario lo pide
- Puedes ELIMINAR entrenamientos si el usuario lo solicita
- Puedes responder preguntas sobre su progreso

Responde SIEMPRE en formato JSON válido:
{
  "action": "UPDATE_SESSION" | "DELETE_SESSION" | "CHAT",
  "targetDate": "YYYY-MM-DD",
  "updates": {
    "routineName": "string",
    "didCardio": boolean,
    "cardioMinutes": number,
    "totalCalories": number,
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
${coachContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: 'user', content: userMessage }
    ];
    
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    let result;
    
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse coach JSON:', content);
      return content || 'No pude procesar tu mensaje.';
    }

    let finalMessage = result.message || 'Procesado.';

    // Ejecutar acción si es necesario
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
          // Primero eliminar los sets relacionados
          await prisma.workoutSet.deleteMany({
            where: { workoutSessionId: existingSession.id }
          });
          // Luego eliminar la sesión
          await prisma.workoutSession.delete({
            where: { id: existingSession.id }
          });
          finalMessage = result.message || `Entrenamiento del ${result.targetDate} eliminado correctamente.`;
        } else {
          // UPDATE_SESSION
          const updateData = {};
          if (result.updates?.routineName !== undefined) updateData.routineName = result.updates.routineName;
          if (result.updates?.didCardio !== undefined) updateData.didCardio = result.updates.didCardio;
          if (result.updates?.cardioMinutes !== undefined) updateData.cardioMinutes = result.updates.cardioMinutes;
          if (result.updates?.totalCalories !== undefined) updateData.totalCalories = result.updates.totalCalories;
          
          const newNote = `[AI: ${result.updates?.correctionReason || 'Modificado via Telegram'}]`;
          updateData.notes = existingSession.notes 
            ? `${existingSession.notes}\n${newNote}`
            : newNote;
  
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
 * Analiza un workout y da feedback
 */
export async function analyzeWorkout(workoutData) {
  try {
    const { routineName, sets, cardio, duration, calories } = workoutData;
    
    const systemPrompt = `Eres un coach de gimnasio. Analiza este entrenamiento y da feedback breve (2-3 oraciones).

ENTRENAMIENTO:
- Rutina: ${routineName}
- Series totales: ${sets}
- Duración: ${duration} minutos
- Calorías: ${calories}
- Cardio: ${cardio.did ? `${cardio.minutes} min (${cardio.intensity})` : 'No'}

Da una valoración honesta. Si fue buen entrenamiento, felicita. Si fue corto/poco intenso, sugiere mejoras.`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analiza mi entrenamiento' }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return response.choices[0]?.message?.content || '¡Buen trabajo!';
  } catch (error) {
    console.error('Error analyzing workout:', error);
    return '¡Buen entrenamiento! Sigue así.';
  }
}

/**
 * Parsea texto libre de entrenamiento
 */
export async function parseWorkoutText(text) {
  try {
    const exercises = await prisma.exercise.findMany({
      select: { id: true, name: true }
    });
    
    const exerciseNames = exercises.map(e => e.name).join(', ');
    
    const systemPrompt = `Eres un parser de entrenamientos. El usuario describirá su entrenamiento en texto libre. 
Tu tarea es extraer la información estructurada.

EJERCICIOS DISPONIBLES EN LA APP:
${exerciseNames}

INSTRUCCIONES:
1. Identifica los ejercicios mencionados (usa los nombres exactos de arriba cuando sea posible)
2. Extrae peso y repeticiones de cada serie
3. Identifica si hizo cardio y cuánto

RESPONDE SOLO EN ESTE FORMATO JSON (sin markdown, sin explicaciones):
{
  "exercises": [
    {"name": "Nombre Exacto", "sets": [{"weight": 80, "reps": 10}]}
  ],
  "cardio": {"did": false, "minutes": 0, "intensity": null},
  "notes": "cualquier nota adicional"
}

Si no puedes parsear algo, usa valores por defecto (peso: 0, reps: 0).`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      for (const ex of parsed.exercises || []) {
        const match = exercises.find(e => 
          e.name.toLowerCase() === ex.name.toLowerCase() ||
          e.name.toLowerCase().includes(ex.name.toLowerCase()) ||
          ex.name.toLowerCase().includes(e.name.toLowerCase())
        );
        if (match) {
          ex.id = match.id;
          ex.name = match.name;
        }
      }
      
      return parsed;
    } catch (e) {
      console.error('Error parsing workout JSON:', e);
      return null;
    }
  } catch (error) {
    console.error('Error parsing workout text:', error);
    return null;
  }
}

// Helpers

function countConsecutiveTrainingDays(workouts) {
  if (!workouts.length) return 0;
  
  let count = 0;
  const today = getColombiaDate();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < workouts.length; i++) {
    const workoutDate = new Date(workouts[i].date);
    workoutDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (workoutDate.getTime() === expectedDate.getTime() && workouts[i].routineName !== 'Descanso') {
      count++;
    } else {
      break;
    }
  }
  
  return count;
}

export default {
  getDailyTip,
  chatWithCoach,
  analyzeWorkout,
  parseWorkoutText,
};
