import { NextResponse } from 'next/server';
import { chatJSON } from '@/lib/nvidia-nim';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Helper: ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// GET: Retrieve reports
// ?type=daily&date=2026-02-14  OR  ?type=weekly&week=7&year=2026
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'daily';

  try {
    if (type === 'weekly') {
      const week = parseInt(searchParams.get('week'));
      const year = parseInt(searchParams.get('year'));

      if (!week || !year) {
        return NextResponse.json({ error: 'week and year required' }, { status: 400 });
      }

      const report = await prisma.weeklyReport.findUnique({
        where: { weekNumber_year: { weekNumber: week, year } }
      });

      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      return NextResponse.json({
        ...report,
        content: JSON.parse(report.content)
      });
    }

    // Daily
    const date = searchParams.get('date');
    if (date) {
      const report = await prisma.dailyReport.findUnique({
        where: { date: new Date(date) }
      });
      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json({
        ...report,
        content: JSON.parse(report.content)
      });
    }

    // Return all daily reports for current week
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    const reports = await prisma.dailyReport.findMany({
      where: { weekNumber: currentWeek, year: currentYear },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(reports.map(r => ({
      ...r,
      content: JSON.parse(r.content)
    })));

  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// POST: Generate a report
// body: { type: "daily", date: "2026-02-14" }  OR  { type: "weekly" }
export async function POST(request) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'weekly') {
      return await generateWeeklyReport();
    }

    // Default: daily
    const date = body.date ? new Date(body.date) : new Date();
    return await generateDailyReport(date);

  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// ─── Daily Report Generation ──────────────────────────────────
async function generateDailyReport(date) {
  const dateStr = date.toISOString().slice(0, 10);
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  // Get session for the day
  const session = await prisma.workoutSession.findFirst({
    where: { date: { gte: startOfDay, lte: endOfDay } },
    include: { sets: true }
  });

  // Get previous day's report for context
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevReport = await prisma.dailyReport.findUnique({
    where: { date: new Date(prevDate.toISOString().slice(0, 10)) }
  }).catch(() => null);

  const prompt = `Genera un reporte diario de entrenamiento para ${dateStr}.

${session ? `Sesion del dia:
- Grupo muscular: ${session.didCardio && session.muscleGroup === 'Descanso' ? 'Descanso activo' : session.muscleGroup}
- Duracion: ${session.durationMinutes || '?'} min
- Calorias: ${session.totalCalories || '?'} kcal
- Fatiga: ${session.fatigueLevel || '?'}/10
- RIR: ${session.rirScore ?? '?'}
- Cardio: ${session.didCardio ? `Si - ${session.cardioType} ${session.cardioMinutes}min` : 'No'}
- Feeling: ${session.feeling || 'Sin comentario'}
- Ejercicios: ${session.sets.map(s => `${s.exerciseName} ${s.weight}kg ${s.sets}x${s.reps}`).join(', ')}` : 'DIA DE DESCANSO - No hubo entrenamiento.'}

${prevReport ? `Reporte del dia anterior: ${prevReport.content}` : ''}

Genera JSON con:
{
  "type": "training" | "rest",
  "summary": "Resumen de 1-2 frases del dia",
  "muscleGroup": "grupo trabajado o null",
  "totalVolume": number (kg totales movidos) o 0,
  "peakExercise": "ejercicio con mas peso" o null,
  "peakWeight": number o 0,
  "fatigueAccumulated": number (1-10, considerando dias anteriores),
  "recommendation": "Recomendacion breve para manana",
  "highlights": ["logro 1", "logro 2"] o []
}`;

  const content = await chatJSON(
    [{ role: 'user', content: prompt }],
    { temperature: 0.3, maxTokens: 512, model: 'coach_llama' }
  );

  const weekNumber = getWeekNumber(date);
  const year = date.getFullYear();

  const report = await prisma.dailyReport.upsert({
    where: { date: new Date(dateStr) },
    update: {
      content: JSON.stringify(content),
      weekNumber,
      year
    },
    create: {
      date: new Date(dateStr),
      content: JSON.stringify(content),
      weekNumber,
      year
    }
  });

  return NextResponse.json({ ...report, content });
}

// ─── Weekly Report Generation ─────────────────────────────────
async function generateWeeklyReport() {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();

  // Get all daily reports for this week
  const dailyReports = await prisma.dailyReport.findMany({
    where: { weekNumber, year },
    orderBy: { date: 'asc' }
  });

  // Get all sessions for this week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const sessions = await prisma.workoutSession.findMany({
    where: { date: { gte: startOfWeek } },
    include: { sets: true },
    orderBy: { date: 'asc' }
  });

  // Get previous week report for comparison
  const prevWeek = weekNumber === 1 ? 52 : weekNumber - 1;
  const prevYear = weekNumber === 1 ? year - 1 : year;
  const prevWeekReport = await prisma.weeklyReport.findUnique({
    where: { weekNumber_year: { weekNumber: prevWeek, year: prevYear } }
  }).catch(() => null);

  const prompt = `Genera un reporte semanal de entrenamiento (Semana ${weekNumber}, ${year}).

Rutina del usuario: Arnold Split - Pecho/Espalda, Pierna, Brazos (3 dias/semana).

Sesiones de la semana:
${sessions.map(s => {
    const d = new Date(s.date).toISOString().slice(0, 10);
    const exercises = s.sets.map(set => `${set.exerciseName}: ${set.weight}kg ${set.sets}x${set.reps}`).join('; ');
    return `- ${d}: ${s.didCardio && s.muscleGroup === 'Descanso' ? 'Descanso activo' : s.muscleGroup} | ${s.totalCalories || '?'}kcal | Fatiga:${s.fatigueLevel || '?'} | RIR:${s.rirScore ?? '?'} | ${exercises}`;
  }).join('\n') || 'Sin sesiones registradas.'}

Reportes diarios:
${dailyReports.map(r => `- ${new Date(r.date).toISOString().slice(0, 10)}: ${r.content}`).join('\n') || 'Sin reportes diarios.'}

${prevWeekReport ? `Reporte semana anterior: ${prevWeekReport.content}` : 'Sin reporte previo.'}

Genera JSON con:
{
  "summary": "Resumen de la semana en 2-3 frases",
  "daysTraining": number,
  "daysRest": number,
  "musclesWorked": ["grupo1", "grupo2"],
  "totalVolumeKg": number,
  "avgFatigue": number (promedio 1-10),
  "avgRIR": number (promedio 0-5),
  "totalCalories": number,
  "prs": [{"exercise": "nombre", "weight": number, "isPR": boolean}],
  "weightProgression": "subiendo | estable | bajando | sin datos",
  "adherence": "excelente | buena | regular | baja",
  "recommendations": ["recomendacion 1", "recomendacion 2"],
  "weekGrade": "A | B | C | D" 
}`;

  const content = await chatJSON(
    [{ role: 'user', content: prompt }],
    { temperature: 0.3, maxTokens: 1024, model: 'coach_llama' }
  );

  const report = await prisma.weeklyReport.upsert({
    where: { weekNumber_year: { weekNumber, year } },
    update: {
      content: JSON.stringify(content),
      updatedAt: new Date()
    },
    create: {
      weekNumber,
      year,
      content: JSON.stringify(content)
    }
  });

  return NextResponse.json({ ...report, content });
}
