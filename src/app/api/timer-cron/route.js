/**
 * Cron Job para Timer de Descanso
 * Se ejecuta cada minuto para verificar timers expirados
 * Llamado por cron-job.org (servicio externo gratuito)
 */

import { NextResponse } from 'next/server';
import { checkExpiredTimers } from '../../../../bot/lib/handlers/timer.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 segundos max

export async function GET(request) {
  try {
    // Chequear timers expirados y notificar
    const results = await checkExpiredTimers();
    
    return NextResponse.json({ 
      ok: true, 
      checked: new Date().toISOString(),
      notified: results.length,
      results
    });
    
  } catch (error) {
    console.error('Timer cron error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST para testing manual
export async function POST(request) {
  return GET(request);
}
