/**
 * Servicio de Coach AI
 * Integración con Groq para consejos y análisis
 */

import Groq from 'groq-sdk';
import { getPrisma } from '../../../src/lib/prisma.js';

const prisma = getPrisma();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'llama-3.3-70b-versatile';

/**
 * Obtiene el consejo diario del coach
 */
export async function getDailyTip() {
  try {
    // Obtener historial reciente
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
    
    // Verificar si ya entrenó hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trainedToday = recentWorkouts.some(w => {
      const workoutDate = new Date(w.date);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === today.getTime() && w.routineName !== 'Descanso';
    });
    
    if (trainedToday) {
      return {
        message: 'Ya entrenaste hoy. Enfocate en la recuperacion: buena alimentacion, hidratacion y descanso.',
        action: 'Recuperacion'
      };
    }
    
    // Analizar patrones
    const consecutiveDays = countConsecutiveTrainingDays(recentWorkouts);
    const lastRoutines = recentWorkouts
      .filter(w => w.routineName !== 'Descanso')
      .slice(0, 3)
      .map(w => w.routineName);
    
    const systemPrompt = `Eres un coach de gimnasio experto. Analiza el historial del usuario y da UN consejo breve y directo para hoy.

Historial reciente:
${recentWorkouts.map(w => `- ${new Date(w.date).toLocaleDateString('es')}: ${w.routineName}`).join('\n')}

Dias consecutivos entrenando: ${consecutiveDays}
Ultimas rutinas: ${lastRoutines.join(', ') || 'Ninguna'}

Responde en español, maximo 2-3 oraciones. Sugiere una rutina especifica o descanso segun corresponda.`;

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
    
    // Detectar acción sugerida
    let action = 'Entreno';
    if (message.toLowerCase().includes('descanso') || message.toLowerCase().includes('recupera')) {
      action = 'Descanso';
    } else {
      // Buscar rutina mencionada
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
      message: 'No pude conectar con el coach. Entrena lo que sientas!',
      action: 'Error'
    };
  }
}

/**
 * Chat conversacional con el coach
 */
export async function chatWithCoach(userMessage, conversationHistory = []) {
  try {
    // Obtener contexto
    const recentWorkouts = await prisma.workoutSession.findMany({
      take: 7,
      orderBy: { date: 'desc' },
      include: {
        sets: {
          include: { exercise: true }
        }
      }
    });
    
    const lastWeight = await prisma.weightLog.findFirst({
      orderBy: { date: 'desc' }
    });
    
    const systemPrompt = `Eres Miguel, un coach de gimnasio amigable y motivador. Hablas en español informal.

CONTEXTO DEL USUARIO:
- Fecha actual: ${new Date().toLocaleDateString('es')}
- Ultimo peso: ${lastWeight ? `${lastWeight.weight} kg` : 'No registrado'}

HISTORIAL RECIENTE (ultimos 7 dias):
${recentWorkouts.map(w => {
  const dateStr = new Date(w.date).toLocaleDateString('es');
  const setsInfo = w.sets.length > 0 
    ? `(${w.sets.length} series, ${w.totalCalories || 0} kcal)` 
    : '';
  return `- ${dateStr}: ${w.routineName} ${setsInfo}`;
}).join('\n')}

INSTRUCCIONES:
- Responde de forma breve y directa (2-4 oraciones max)
- Usa los datos del historial para personalizar respuestas
- Si preguntan que entrenar, sugiere basado en lo que NO han hecho recientemente
- Motiva pero se realista
- NO uses emojis excesivos`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Últimos 6 mensajes para contexto
      { role: 'user', content: userMessage }
    ];
    
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 300,
      temperature: 0.8,
    });
    
    return response.choices[0]?.message?.content || 'No pude procesar tu mensaje.';
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
- Duracion: ${duration} minutos
- Calorias: ${calories}
- Cardio: ${cardio.did ? `${cardio.minutes} min (${cardio.intensity})` : 'No'}

Da una valoracion honesta. Si fue buen entrenamiento, felicita. Si fue corto/poco intenso, sugiere mejoras.`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analiza mi entrenamiento' }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return response.choices[0]?.message?.content || 'Buen trabajo!';
  } catch (error) {
    console.error('Error analyzing workout:', error);
    return 'Buen entrenamiento! Sigue asi.';
  }
}

/**
 * Parsea texto libre de entrenamiento
 */
export async function parseWorkoutText(text) {
  try {
    // Obtener ejercicios disponibles para matching
    const exercises = await prisma.exercise.findMany({
      select: { id: true, name: true }
    });
    
    const exerciseNames = exercises.map(e => e.name).join(', ');
    
    const systemPrompt = `Eres un parser de entrenamientos. El usuario describira su entrenamiento en texto libre. 
Tu tarea es extraer la informacion estructurada.

EJERCICIOS DISPONIBLES EN LA APP:
${exerciseNames}

INSTRUCCIONES:
1. Identifica los ejercicios mencionados (usa los nombres exactos de arriba cuando sea posible)
2. Extrae peso y repeticiones de cada serie
3. Identifica si hizo cardio y cuanto

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
    
    // Intentar parsear JSON
    try {
      // Limpiar posibles artefactos
      const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      // Mapear nombres de ejercicios a IDs
      for (const ex of parsed.exercises || []) {
        const match = exercises.find(e => 
          e.name.toLowerCase() === ex.name.toLowerCase() ||
          e.name.toLowerCase().includes(ex.name.toLowerCase()) ||
          ex.name.toLowerCase().includes(e.name.toLowerCase())
        );
        if (match) {
          ex.id = match.id;
          ex.name = match.name; // Usar nombre exacto
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
  const today = new Date();
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
