/**
 * Webhook de Telegram
 * Recibe updates del bot y los procesa
 */

import { NextResponse } from 'next/server';
import { handleUpdate } from '../../../../bot/lib/handlers/index.js';

// Verificar secret del webhook
function verifyWebhook(request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  // Si no hay secret configurado, permitir (desarrollo)
  if (!secret) return true;
  
  // Telegram envía el secret en el header X-Telegram-Bot-Api-Secret-Token
  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
  
  // También verificar query param como fallback
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  
  return headerSecret === secret || querySecret === secret;
}

export async function POST(request) {
  try {
    // Verificar secret
    if (!verifyWebhook(request)) {
      console.warn('Unauthorized webhook request');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parsear update
    const update = await request.json();
    
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));
    
    // Procesar update
    const result = await handleUpdate(update);
    
    console.log('Update processed:', result);
    
    return NextResponse.json({ ok: true, result });
    
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET para verificar que el webhook está activo
export async function GET(request) {
  return NextResponse.json({
    ok: true,
    message: 'GymTracker Telegram Bot Webhook',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}
