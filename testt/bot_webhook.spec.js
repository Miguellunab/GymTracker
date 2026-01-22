/**
 * Tests para el Bot de Telegram - GymTracker
 * Tests de integración para el webhook y handlers
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

// Helper para simular updates de Telegram
function createMessageUpdate(chatId, text) {
  return {
    update_id: Date.now(),
    message: {
      message_id: Date.now(),
      from: {
        id: chatId,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: chatId,
        first_name: 'Test',
        username: 'testuser',
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text
    }
  };
}

function createCallbackUpdate(chatId, messageId, callbackData) {
  return {
    update_id: Date.now(),
    callback_query: {
      id: String(Date.now()),
      from: {
        id: chatId,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      message: {
        message_id: messageId,
        chat: {
          id: chatId,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000)
      },
      chat_instance: String(Date.now()),
      data: callbackData
    }
  };
}

test.describe('Telegram Bot Webhook', () => {
  
  test('GET /api/telegram returns status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/telegram`);
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe('active');
  });

  test('POST /api/telegram handles /start command', async ({ request }) => {
    const chatId = 123456789;
    const update = createMessageUpdate(chatId, '/start');
    
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: update
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.action).toBe('command');
    expect(json.result.command).toBe('/start');
  });

  test('POST /api/telegram handles /help command', async ({ request }) => {
    const chatId = 123456789;
    const update = createMessageUpdate(chatId, '/help');
    
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: update
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.action).toBe('command');
  });

  test('POST /api/telegram handles timer button (main keyboard)', async ({ request }) => {
    const chatId = 123456789;
    const update = createMessageUpdate(chatId, '⏱️ 3min');
    
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: update
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
  });

  test('POST /api/telegram handles /workout command', async ({ request }) => {
    const chatId = 123456789;
    const update = createMessageUpdate(chatId, '/workout');
    
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: update
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.action).toBe('command');
  });

  test('POST /api/telegram handles /historial command', async ({ request }) => {
    const chatId = 123456789;
    const update = createMessageUpdate(chatId, '/historial');
    
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: update
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
  });

  test('POST /api/telegram handles callback query', async ({ request }) => {
    const chatId = 123456789;
    const update = createCallbackUpdate(chatId, 1, 'timer_cancel');
    
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: update
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.action).toBe('callback');
  });

  test('POST /api/telegram ignores empty updates', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/telegram`, {
      data: { update_id: Date.now() }
    });
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.result.action).toBe('ignored');
  });

});

test.describe('Telegram Cron Endpoint', () => {
  
  test('GET /api/telegram-cron requires chat_id config', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/telegram-cron`);
    
    // Puede retornar error si no hay TELEGRAM_OWNER_CHAT_ID
    const json = await response.json();
    expect(json).toHaveProperty('ok');
  });

});
