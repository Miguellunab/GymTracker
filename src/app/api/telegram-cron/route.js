/**
 * Cron Job para notificación matutina
 * Envía el consejo del día cada mañana
 */

import { NextResponse } from 'next/server';
import { sendMessage } from '../../../../bot/lib/telegram.js';
import { getDailyTip } from '../../../../bot/lib/services/coach.js';
import { MESSAGES, EMOJI } from '../../../../bot/lib/constants.js';

export async function GET(request) {
  try {
    // Verificar autorización (Vercel Cron envía CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Permitir si no hay secret (desarrollo) o si coincide
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener chat ID del owner
    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    
    if (!chatId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'TELEGRAM_OWNER_CHAT_ID not configured' 
      }, { status: 400 });
    }
    
    // Obtener consejo del día
    const tip = await getDailyTip();
    
    // Enviar mensaje
    const message = `${EMOJI.MUSCLE} *Buenos días!*\n\n${MESSAGES.COACH_DAILY_TIP(tip.message)}`;
    
    const result = await sendMessage(chatId, message);
    
    if (result) {
      return NextResponse.json({ 
        ok: true, 
        message: 'Daily tip sent',
        tip: tip.message
      });
    } else {
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to send message' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST también para testing manual
export async function POST(request) {
  return GET(request);
}
