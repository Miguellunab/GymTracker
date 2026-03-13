import { chatJSON } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';
import { ensureExerciseCatalog, resolveExerciseEntries } from '@/lib/exercise-catalog';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    await ensureExerciseCatalog(prisma);
    const body = await request.json();
    const { muscleGroup, exercises, cardio, feeling, durationMinutes } = body;

    const weightLog = await prisma.weightLog.findFirst({
      orderBy: { date: 'desc' }
    });
    const userWeight = weightLog?.weight || 75;

    const safeExercises = Array.isArray(exercises) ? exercises : [];
    const exerciseResolutions = safeExercises.length > 0
      ? await resolveExerciseEntries(prisma, safeExercises, { allowCreateCustom: false })
      : [];
    const needsClarification = exerciseResolutions
      .map((resolution, index) => ({ resolution, exercise: safeExercises?.[index] }))
      .filter(({ resolution }) => resolution?.status === 'ambiguous');

    if (needsClarification.length > 0) {
      return Response.json({
        needsClarification: true,
        ambiguousExercises: needsClarification.map(({ resolution, exercise }) => ({
          original: exercise?.name,
          question: resolution.question,
          options: [...resolution.options, { canonicalName: 'Otro', slug: 'other', equipment: 'custom' }],
        })),
      });
    }

    const normalizedExercises = safeExercises.map((exercise, index) => ({
      ...exercise,
      name: exerciseResolutions[index]?.status === 'resolved'
        ? exerciseResolutions[index].canonicalName
        : exercise.name,
    }));

    const systemPrompt = `Eres un experto fisiologo deportivo. Analiza esta sesion de entrenamiento y genera metricas precisas.

Datos del atleta:
- Peso corporal: ${userWeight} kg

Entrenamiento realizado:
- Grupo muscular: ${muscleGroup}
- Duracion total: ${durationMinutes || 'no especificada'} minutos
- Ejercicios: ${JSON.stringify(normalizedExercises)}
- Cardio: ${JSON.stringify(cardio)}
- Como se sintio: "${feeling || 'sin comentario'}"

Instrucciones:
1. Calcula calorias totales quemadas (pesas + cardio si hay). Pesas: 3-8 kcal/min segun intensidad. Cardio: 6-12 kcal/min segun tipo.
2. Genera un NIT rating (Nivel de Intensidad Total) de 1-10 basado en volumen, peso y feedback.
3. Genera un nivel de fatiga de 1-10 basado en el feeling del usuario y la carga de trabajo.
4. Escribe un analisis breve (2-3 frases) sobre el rendimiento.
5. Usa exactamente los nombres de ejercicios ya normalizados que recibes. No los cambies.

Responde SOLO con JSON valido, sin markdown ni explicacion adicional:
{"totalCalories": number, "nitRating": number, "fatigueLevel": number, "analysis": "string con analisis breve", "normalizedExercises": [{"original": "nombre original", "normalized": "nombre normalizado"}]}`;

    const result = await chatJSON(
      [
        { role: 'system', content: 'Eres un fisiologo deportivo. Responde siempre en JSON valido sin markdown.' },
        { role: 'user', content: systemPrompt }
      ],
      { temperature: 0.3, maxTokens: 512, model: 'analysis' }
    );

    if (!Array.isArray(result.normalizedExercises)) {
      result.normalizedExercises = normalizedExercises.map((exercise, index) => ({
        original: safeExercises?.[index]?.name || exercise.name,
        normalized: exercise.name,
      }));
    }

    return Response.json(result);

  } catch (error) {
    console.error('Analyze workout error:', error?.message || error);
    return Response.json({
      totalCalories: 300,
      nitRating: 5,
      fatigueLevel: 5,
      analysis: 'No se pudo conectar con AI. Estimaciones por defecto.',
      normalizedExercises: []
    });
  }
}
