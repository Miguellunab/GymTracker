import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { Receiver } from '@upstash/qstash';
import { getPrisma } from '@/lib/prisma';

function getMode(request, payload) {
  if (payload?.mode) return payload.mode;
  if (!request.cookies) return 'main';
  return request.cookies.get('app_mode')?.value ?? 'main';
}

function getReceiver() {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) return null;
  return new Receiver({ currentSigningKey: current, nextSigningKey: next });
}

export async function POST(request) {
  const receiver = getReceiver();
  if (receiver) {
    const signature = request.headers.get('upstash-signature');
    const bodyText = await request.text();
    const isValid = await receiver.verify({ signature, body: bodyText });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(bodyText || '{}');
    return await triggerPush(request, payload);
  }

  const payload = await request.json();
  return await triggerPush(request, payload);
}

async function triggerPush(request, payload) {
  const endpoint = payload?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'Missing VAPID keys' }, { status: 500 });
  }

  const subject = process.env.VAPID_SUBJECT || 'mailto:coach@gymtracker.app';
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const prisma = getPrisma(getMode(request, payload));
  const subscription = await prisma.pushSubscription.findUnique({
    where: { endpoint }
  });

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const message = JSON.stringify({
    title: '¡Descanso Terminado!',
    body: 'Tu temporizador ha finalizado. Regresa al entrenamiento.',
    data: { url: '/workout' }
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.keys_auth,
          p256dh: subscription.keys_p256dh
        }
      },
      message
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const statusCode = error?.statusCode || error?.status;
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => {});
    }
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 });
  }
}
