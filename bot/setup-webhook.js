/**
 * Script para configurar el webhook de Telegram
 * 
 * Uso:
 *   node bot/setup-webhook.js https://tu-app.vercel.app
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function main() {
  const baseUrl = process.argv[2];
  
  if (!baseUrl) {
    console.log('Uso: node bot/setup-webhook.js <URL_BASE>');
    console.log('Ejemplo: node bot/setup-webhook.js https://mi-app.vercel.app');
    process.exit(1);
  }
  
  if (!BOT_TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN no está configurado');
    process.exit(1);
  }
  
  const webhookUrl = `${baseUrl}/api/telegram`;
  const params = new URLSearchParams({
    url: webhookUrl,
  });
  
  if (WEBHOOK_SECRET) {
    params.append('secret_token', WEBHOOK_SECRET);
  }
  
  console.log('Configurando webhook...');
  console.log(`URL: ${webhookUrl}`);
  console.log(`Secret: ${WEBHOOK_SECRET ? '****' + WEBHOOK_SECRET.slice(-4) : 'No configurado'}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?${params.toString()}`
    );
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('\n✅ Webhook configurado exitosamente!');
      console.log(data.description);
    } else {
      console.error('\n❌ Error configurando webhook:');
      console.error(data.description);
    }
    
    // Verificar estado
    console.log('\nVerificando configuración...');
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    const info = await infoResponse.json();
    
    if (info.ok) {
      console.log('\nEstado del webhook:');
      console.log(`  URL: ${info.result.url || 'No configurado'}`);
      console.log(`  Pendientes: ${info.result.pending_update_count}`);
      console.log(`  Último error: ${info.result.last_error_message || 'Ninguno'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
