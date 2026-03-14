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

    const systemPrompt = `Eres un experto fisiologo deportivo y analista de entrenamiento. Analiza esta sesion con calma, razonando todos los detalles antes de responder.
No asumas que una frase inicial describe toda la sesion: si el usuario dice que un ejercicio fue suave pero luego aclara que el resto fue fuerte o al fallo, debes ponderar toda la sesion completa.
No muestres tu razonamiento. Solo devuelve el resultado final cuando ya hayas evaluado todo.

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
2. Genera un RIR global estimado para la sesion de 0-5, donde 0 significa que termino muy cerca del fallo en la mayor parte del trabajo efectivo y 5 significa que dejo muchas repeticiones en reserva.
3. Genera un nivel de fatiga de 1-10 basado en el feeling del usuario y la carga de trabajo.
4. Escribe un analisis breve (2-3 frases) sobre el rendimiento.
5. Usa exactamente los nombres de ejercicios ya normalizados que recibes. No los cambies.

Responde SOLO con JSON valido, sin markdown, sin texto adicional y sin etiquetas como <think>:
{"totalCalories": number, "rirScore": number, "fatigueLevel": number, "analysis": "string con analisis breve", "normalizedExercises": [{"original": "nombre original", "normalized": "nombre normalizado"}]}`;

    const result = await chatJSON(
      [
        { role: 'system', content: 'Eres un fisiologo deportivo. Responde siempre en JSON valido sin markdown.' },
        { role: 'user', content: systemPrompt }
      ],
      { temperature: 0.2, maxTokens: 700, model: 'analysis' }
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
      rirScore: 2,
      fatigueLevel: 5,
      analysis: 'No se pudo conectar con AI. Estimaciones por defecto.',
      normalizedExercises: []
    });
  }
}
