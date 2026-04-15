/**
 * Cron Job - Morning notification + message cleanup
 * BOT DESHABILITADO TEMPORALMENTE (VERCEL CRON NO HARÁ NADA)
 */

import { NextResponse } from 'next/server';

export async function GET(request) {
  // Bot desactivado temporalmente a petición del usuario.
  return NextResponse.json({
    ok: true,
    message: 'Cron desactivado temporalmente por mantenimiento.',
    disabled: true
  });
}

// POST for manual testing
export async function POST(request) {
  return GET(request);
}
