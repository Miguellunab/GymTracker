import { NextResponse } from 'next/server';

const ALLOWED_MODES = ['main', 'test', 'dev'];

export async function GET(request) {
  const mode = request.cookies?.get('app_mode')?.value ?? 'main';
  return NextResponse.json({ mode });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = body?.mode;
    if (!ALLOWED_MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (mode === 'dev') {
      const pin = body?.pin;
      const expected = process.env.APP_DEV_PIN || '0522';
      if (pin !== expected) {
        return NextResponse.json({ error: 'Invalid pin' }, { status: 401 });
      }
    }

    const response = NextResponse.json({ success: true, mode });
    response.cookies.set('app_mode', mode, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set mode' }, { status: 500 });
  }
}
