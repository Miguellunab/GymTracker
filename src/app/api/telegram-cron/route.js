/**
 * Cron Job - Morning notification + message cleanup
 * Sends daily tip via Telegram and cleans up old messages
 */

import { NextResponse } from 'next/server';
import { sendMessage, deleteMessage } from '../../../../bot/lib/telegram.js';
import prisma from '@/lib/prisma';
import { chat } from '@/lib/nvidia-nim';

export async function GET(request) {
  try {
    // Verify authorization (Vercel Cron sends CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({
        ok: false,
        error: 'TELEGRAM_OWNER_CHAT_ID not configured'
      }, { status: 400 });
    }

    // --- 1. Clean up old messages (>24h) ---
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldMessages = await prisma.telegramMessage.findMany({
      where: { sentAt: { lt: cutoff } }
    });

    let deletedCount = 0;
    for (const msg of oldMessages) {
      try {
        await deleteMessage(msg.chatId, msg.messageId);
        deletedCount++;
      } catch (e) {
        // Message may already be deleted or too old for Telegram API
      }
    }

    if (oldMessages.length > 0) {
      await prisma.telegramMessage.deleteMany({
        where: { sentAt: { lt: cutoff } }
      });
    }

    // --- 2. Get context for daily tip ---
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get recent workouts (last 7 days)
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentWorkouts = await prisma.workoutSession.findMany({
      where: { date: { gte: weekAgo } },
      include: { sets: true },
      orderBy: { date: 'desc' }
    });

    // Check last workout date
    const lastWorkout = recentWorkouts[0];
    const daysSinceLastWorkout = lastWorkout
      ? Math.floor((now - new Date(lastWorkout.date)) / (1000 * 60 * 60 * 24))
      : 999;

    // Get current weekly report if exists
    const { getISOWeek, getISOWeekYear } = await import('date-fns');
    const currentWeek = getISOWeek(now);
    const currentYear = getISOWeekYear(now);

    const weeklyReport = await prisma.weeklyReport.findUnique({
      where: { weekNumber_year: { weekNumber: currentWeek - 1, year: currentYear } }
    });

    // Build context
    const workoutSummary = recentWorkouts.map(w => {
      const dateStr = new Date(w.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      return `${dateStr}: ${w.muscleGroup || 'Sin grupo'} - ${w.durationMinutes || '?'}min, ${w.totalCalories || '?'}cal, fatiga:${w.fatigueLevel || '?'}/10`;
    }).join('\n') || 'No hubo entrenamientos esta semana';

    let toneInstruction = '';
    if (daysSinceLastWorkout >= 4) {
      toneInstruction = `IMPORTANTE: Han pasado ${daysSinceLastWorkout} días sin entrenar. Sé más insistente y motivacional. No seas pasivo-agresivo, pero sí directo sobre la importancia de retomar.`;
    } else if (daysSinceLastWorkout === 0) {
      toneInstruction = 'El usuario ya entrenó hoy. Felicítalo y sugiere recuperación.';
    }

    // --- 3. Generate daily tip via AI ---
    const systemPrompt = `Eres el coach de fitness personal del usuario. Hablas español de manera directa y motivacional.
Rutina: Arnold Split (Pecho/Espalda, Pierna, Brazos) - 3 días por semana, horario flexible.

Entrenamientos recientes:
${workoutSummary}

${weeklyReport ? `Reporte semanal anterior: ${weeklyReport.content}` : 'Sin reporte semanal previo.'}

${toneInstruction}

Genera un consejo del día corto (2-3 oraciones máximo). Incluye qué grupo muscular debería trabajar hoy si toca entrenar, o si debería descansar. Sé conciso.`;

    const tipText = (await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Dame el consejo del día para hoy ${todayStr}` }
    ], { temperature: 0.8, maxTokens: 200 })).trim();

    // --- 4. Send message ---
    const message = `💪 *Buenos días!*\n\n🎯 ${tipText}`;
    const result = await sendMessage(chatId, message);

    // --- 5. Track sent message ---
    if (result && result.message_id) {
      await prisma.telegramMessage.create({
        data: {
          chatId: String(chatId),
          messageId: result.message_id,
          sentAt: new Date()
        }
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Daily tip sent',
      tip: tipText,
      deletedMessages: deletedCount
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST for manual testing
export async function POST(request) {
  return GET(request);
}
