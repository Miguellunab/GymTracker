import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

function getMode(request) {
  if (!request.cookies) {
    return 'main';
  }
  return request.cookies.get('app_mode')?.value ?? 'main';
}

export async function POST(request) {
  try {
    const { subscription } = await request.json();
    if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const prisma = getPrisma(getMode(request));
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        endpoint: subscription.endpoint,
        keys_auth: subscription.keys.auth,
        keys_p256dh: subscription.keys.p256dh
      },
      update: {
        keys_auth: subscription.keys.auth,
        keys_p256dh: subscription.keys.p256dh
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
