import { chatJSON } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { muscleGroup, exercises, cardio, feeling, durationMinutes } = body;

    // Get user weight for calorie calculations
    const weightLog = await prisma.weightLog.findFirst({
      orderBy: { date: 'desc' }
    });
    const userWeight = weightLog?.weight || 75;

    const systemPrompt = `Eres un experto fisiologo deportivo. Analiza esta sesion de entrenamiento y genera metricas precisas.

Datos del atleta:
- Peso corporal: ${userWeight} kg

Entrenamiento realizado:
- Grupo muscular: ${muscleGroup}
- Duracion total: ${durationMinutes || 'no especificada'} minutos
- Ejercicios: ${JSON.stringify(exercises)}
- Cardio: ${JSON.stringify(cardio)}
- Como se sintio: "${feeling || 'sin comentario'}"

Instrucciones:
1. Calcula calorias totales quemadas (pesas + cardio si hay). Pesas: 3-8 kcal/min segun intensidad. Cardio: 6-12 kcal/min segun tipo.
2. Genera un NIT rating (Nivel de Intensidad Total) de 1-10 basado en volumen, peso y feedback.
3. Genera un nivel de fatiga de 1-10 basado en el feeling del usuario y la carga de trabajo.
4. Escribe un analisis breve (2-3 frases) sobre el rendimiento.
5. Normaliza los nombres de ejercicios (ej: "press banca" -> "Press de banca con barra", "sentadilla" -> "Sentadilla con barra").

Responde SOLO con JSON:
{
  "totalCalories": number,
  "nitRating": number (1-10),
  "fatigueLevel": number (1-10),
  "analysis": "string con analisis breve",
  "normalizedExercises": [{"original": "nombre original", "normalized": "nombre normalizado"}]
}`;

    const result = await chatJSON(
      [{ role: 'system', content: systemPrompt }],
      { temperature: 0.3, maxTokens: 512 }
    );

    return Response.json(result);

  } catch (error) {
    console.error('Analyze workout error:', error);
    // Fallback with reasonable defaults
    return Response.json({
      totalCalories: 300,
      nitRating: 5,
      fatigueLevel: 5,
      analysis: 'No se pudo analizar la sesion. Estimaciones por defecto.',
      normalizedExercises: []
    }, { status: 500 });
  }
}
