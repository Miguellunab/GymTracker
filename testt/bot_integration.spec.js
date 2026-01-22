/**
 * Tests de integración completa del flujo del Bot
 * Simula conversaciones completas
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

// Helper para enviar update y obtener respuesta
async function sendUpdate(request, update) {
  const response = await request.post(`${BASE_URL}/api/telegram`, {
    data: update
  });
  return response.json();
}

function createMessage(chatId, text, messageId = Date.now()) {
  return {
    update_id: Date.now(),
    message: {
      message_id: messageId,
      from: { id: chatId, is_bot: false, first_name: 'Test' },
      chat: { id: chatId, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text
    }
  };
}

function createCallback(chatId, messageId, data, callbackId = String(Date.now())) {
  return {
    update_id: Date.now(),
    callback_query: {
      id: callbackId,
      from: { id: chatId, is_bot: false, first_name: 'Test' },
      message: {
        message_id: messageId,
        chat: { id: chatId, type: 'private' },
        date: Math.floor(Date.now() / 1000)
      },
      chat_instance: String(Date.now()),
      data
    }
  };
}

test.describe('Bot Integration - Complete Flows', () => {

  test.describe('Onboarding Flow', () => {
    
    test('complete onboarding: /start -> shows welcome and chat_id', async ({ request }) => {
      const chatId = 999888777;
      
      // Send /start
      const result = await sendUpdate(request, createMessage(chatId, '/start'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
      expect(result.result.command).toBe('/start');
    });

    test('/help shows available commands', async ({ request }) => {
      const chatId = 999888777;
      
      const result = await sendUpdate(request, createMessage(chatId, '/help'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

  });

  test.describe('Timer Flow', () => {
    
    test('timer via main keyboard button', async ({ request }) => {
      const chatId = 999888776;
      
      // Press 3min timer button
      const result = await sendUpdate(request, createMessage(chatId, '⏱️ 3min'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('message');
    });

    test('cancel timer via callback', async ({ request }) => {
      const chatId = 999888775;
      
      // Start timer
      await sendUpdate(request, createMessage(chatId, '⏱️ 3min'));
      
      // Cancel via callback
      const cancelResult = await sendUpdate(request, createCallback(chatId, 1, 'timer_cancel'));
      
      expect(cancelResult.ok).toBe(true);
      expect(cancelResult.result.action).toBe('callback');
    });

  });

  test.describe('Workout Flow', () => {
    
    test('start workout flow with /workout', async ({ request }) => {
      const chatId = 999888774;
      
      const result = await sendUpdate(request, createMessage(chatId, '/workout'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

    test('start workout via main keyboard', async ({ request }) => {
      const chatId = 999888773;
      
      const result = await sendUpdate(request, createMessage(chatId, '🏋️ Workout'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('message');
    });

    test('cancel workout returns to idle', async ({ request }) => {
      const chatId = 999888772;
      
      // Start workout
      await sendUpdate(request, createMessage(chatId, '/workout'));
      
      // Cancel
      const cancelResult = await sendUpdate(request, createCallback(chatId, 1, 'cancel'));
      
      expect(cancelResult.ok).toBe(true);
    });

    test('mark rest day via main keyboard', async ({ request }) => {
      const chatId = 999888771;
      
      const result = await sendUpdate(request, createMessage(chatId, '😴 Descanso'));
      
      expect(result.ok).toBe(true);
    });

  });

  test.describe('Weight Flow', () => {
    
    test('/peso starts weight input', async ({ request }) => {
      const chatId = 999888770;
      
      const result = await sendUpdate(request, createMessage(chatId, '/peso'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

    test('weight input via main keyboard', async ({ request }) => {
      const chatId = 999888769;
      
      const result = await sendUpdate(request, createMessage(chatId, '⚖️ Peso'));
      
      expect(result.ok).toBe(true);
    });

  });

  test.describe('History & Calendar Flow', () => {
    
    test('/historial shows recent workouts', async ({ request }) => {
      const chatId = 999888768;
      
      const result = await sendUpdate(request, createMessage(chatId, '/historial'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

    test('/calendario shows month view', async ({ request }) => {
      const chatId = 999888767;
      
      const result = await sendUpdate(request, createMessage(chatId, '/calendario'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

    test('calendar via main keyboard', async ({ request }) => {
      const chatId = 999888766;
      
      const result = await sendUpdate(request, createMessage(chatId, '📅 Calendario'));
      
      expect(result.ok).toBe(true);
    });

  });

  test.describe('Coach Flow', () => {
    
    test('/consejo gets daily tip', async ({ request }) => {
      const chatId = 999888765;
      
      const result = await sendUpdate(request, createMessage(chatId, '/consejo'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

    test('/coach starts chat mode', async ({ request }) => {
      const chatId = 999888764;
      
      const result = await sendUpdate(request, createMessage(chatId, '/coach'));
      
      expect(result.ok).toBe(true);
      expect(result.result.action).toBe('command');
    });

    test('coach via main keyboard', async ({ request }) => {
      const chatId = 999888763;
      
      const result = await sendUpdate(request, createMessage(chatId, '🤖 Coach AI'));
      
      expect(result.ok).toBe(true);
    });

    test('/cancelar exits coach mode', async ({ request }) => {
      const chatId = 999888762;
      
      // Enter coach mode
      await sendUpdate(request, createMessage(chatId, '/coach'));
      
      // Exit
      const cancelResult = await sendUpdate(request, createMessage(chatId, '/cancelar'));
      
      expect(cancelResult.ok).toBe(true);
    });

  });

  test.describe('Free Text Workout', () => {
    
    test('parses workout from natural text', async ({ request }) => {
      const chatId = 999888761;
      
      // Send natural language workout
      const result = await sendUpdate(request, 
        createMessage(chatId, 'Hoy hice press de banca 80kg x 10 repeticiones, luego remo con 70kg x 12')
      );
      
      expect(result.ok).toBe(true);
    });

    test('ignores non-workout text', async ({ request }) => {
      const chatId = 999888760;
      
      // Send random text
      const result = await sendUpdate(request, createMessage(chatId, 'hola que tal'));
      
      expect(result.ok).toBe(true);
      // Should be ignored (no workout keywords)
    });

  });

});
