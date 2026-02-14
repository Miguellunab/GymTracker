import { chatJSON, buildReportContext } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const referenceDate = dateParam ? new Date(dateParam) : new Date();

  try {
    // Check if user already trained on the reference date
    const refDateStr = referenceDate.toISOString().slice(0, 10);
    const startOfDay = new Date(refDateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(refDateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const todaySession = await prisma.workoutSession.findFirst({
      where: {
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (todaySession) {
      return Response.json({
        message: `Ya entrenaste hoy (${todaySession.muscleGroup}). Descansa y recuperate bien.`,
        action: 'Recuperacion'
      });
    }

    // Get report context for informed tip
    const reportContext = await buildReportContext(prisma);

    const prompt = `Eres un Coach de Gym experto para un atleta que sigue Arnold Split (Pecho/Espalda, Pierna, Brazos) 3 dias por semana.

Fecha de referencia: ${refDateStr}

${reportContext}

Genera UN consejo personalizado para hoy basado en:
1. Que grupo muscular toca segun su patron (siempre pone pierna entre dias de torso).
2. Si lleva muchos dias sin entrenar, motivalo con urgencia.
3. Si entreno mucho seguido, sugiere descanso.
4. Si hay fatiga acumulada alta, sugiere sesion ligera.
5. Se breve (maximo 2 frases).

Responde SOLO con JSON:
{
  "message": "tu consejo personalizado",
  "action": "Entrenar Pierna | Entrenar Pecho/Espalda | Entrenar Brazos | Descanso | Descanso Activo"
}`;

    const result = await chatJSON(
      [{ role: 'user', content: prompt }],
      { temperature: 0.6, maxTokens: 256 }
    );

    return Response.json(result);

  } catch (error) {
    console.error('Daily coach error:', error);
    return Response.json({
      message: 'Hoy es un gran dia para moverte. Escucha a tu cuerpo!',
      action: 'Entrenar'
    });
  }
}
