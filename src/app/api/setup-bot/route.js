import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Asegura que no se guarde en caché

export async function GET(request) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
    const OWNER_ID = process.env.TELEGRAM_OWNER_CHAT_ID;

    // Obtener la URL base automáticamente desde el request
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    // 1. Configurar Webhook
    const webhookUrl = `${baseUrl}/api/telegram`;
    const params = new URLSearchParams({ url: webhookUrl });
    if (WEBHOOK_SECRET) params.append('secret_token', WEBHOOK_SECRET);

    console.log(`Configurando webhook en: ${webhookUrl}`);

    const webhookResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?${params.toString()}`
    );
    const webhookData = await webhookResponse.json();

    if (!webhookData.ok) {
      throw new Error(`Fallo al configurar webhook: ${webhookData.description}`);
    }

    // 2. Notificar al Admin (Tú)
    let notificationResult = 'No owner configured';
    if (OWNER_ID) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: OWNER_ID,
          text: `🔄 *Bot Re-sincronizado*\n\nLa URL del webhook se actualizó a:\n\`${webhookUrl}\`\n\nPuedes usar /start o /reset para comenzar.`,
          parse_mode: 'Markdown'
        })
      });
      notificationResult = 'Notification sent to owner';
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configurado exitosamente',
      details: {
        url: webhookUrl,
        telegram_response: webhookData.description,
        notification: notificationResult
      }
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
