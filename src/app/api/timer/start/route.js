import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

function getBaseUrl(request) {
  if (process.env.QSTASH_BASE_URL) return process.env.QSTASH_BASE_URL;
  return new URL(request.url).origin;
}

function getMode(request) {
  if (!request.cookies) {
    return 'main';
  }
  return request.cookies.get('app_mode')?.value ?? 'main';
}

export async function POST(request) {
  try {
    const { delaySeconds, subscriptionEndpoint } = await request.json();
    if (!delaySeconds || !subscriptionEndpoint) {
      return NextResponse.json({ error: 'Missing delaySeconds or subscriptionEndpoint' }, { status: 400 });
    }

    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Missing QSTASH_TOKEN' }, { status: 500 });
    }

    const baseUrl = getBaseUrl(request);
    const qstashClient = new Client({ token });

    await qstashClient.publishJSON({
      url: `${baseUrl}/api/timer/trigger`,
      body: { endpoint: subscriptionEndpoint, mode: getMode(request) },
      delay: Number(delaySeconds)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to schedule timer' }, { status: 500 });
  }
}
