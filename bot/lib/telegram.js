/**
 * Cliente API de Telegram
 * Wrapper para las llamadas a la API de Telegram Bot
 */

import { BOT_CONFIG } from './constants.js';

const API_BASE = `https://api.telegram.org/bot${BOT_CONFIG.TOKEN}`;

/**
 * Hace una petición a la API de Telegram
 */
async function callAPI(method, params = {}) {
  const url = `${API_BASE}/${method}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      console.error(`Telegram API error [${method}]:`, data.description);
      return null;
    }
    
    return data.result;
  } catch (error) {
    console.error(`Telegram API error [${method}]:`, error.message);
    return null;
  }
}

/**
 * Envía un mensaje de texto
 */
export async function sendMessage(chatId, text, options = {}) {
  const params = {
    chat_id: chatId,
    text,
    ...options,
  };
  // Solo agregar parse_mode si no se deshabilitó explícitamente
  if (options.parse_mode !== null && options.parse_mode !== false) {
    params.parse_mode = options.parse_mode || 'Markdown';
  }
  return callAPI('sendMessage', params);
}

/**
 * Envía un mensaje con teclado reply (permanente)
 */
export async function sendMessageWithKeyboard(chatId, text, keyboard, options = {}) {
  return callAPI('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      is_persistent: true,
    },
    ...options,
  });
}

/**
 * Envía un mensaje con botones inline
 */
export async function sendMessageWithInlineKeyboard(chatId, text, inlineKeyboard, options = {}) {
  return callAPI('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
    ...options,
  });
}

/**
 * Edita un mensaje existente
 */
export async function editMessage(chatId, messageId, text, options = {}) {
  return callAPI('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown',
    ...options,
  });
}

/**
 * Edita un mensaje con botones inline
 */
export async function editMessageWithInlineKeyboard(chatId, messageId, text, inlineKeyboard, options = {}) {
  return callAPI('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
    ...options,
  });
}

/**
 * Elimina un mensaje
 */
export async function deleteMessage(chatId, messageId) {
  return callAPI('deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * Responde a un callback query (para quitar el loading de botones)
 */
export async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  return callAPI('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * Envía acción de "escribiendo..."
 */
export async function sendChatAction(chatId, action = 'typing') {
  return callAPI('sendChatAction', {
    chat_id: chatId,
    action,
  });
}

/**
 * Configura el webhook
 */
export async function setWebhook(url, secret) {
  return callAPI('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
  });
}

/**
 * Elimina el webhook
 */
export async function deleteWebhook() {
  return callAPI('deleteWebhook');
}

/**
 * Obtiene información del webhook
 */
export async function getWebhookInfo() {
  return callAPI('getWebhookInfo');
}

/**
 * Envía múltiples mensajes con delay
 */
export async function sendMultipleMessages(chatId, messages, delayMs = 500) {
  for (const msg of messages) {
    await sendMessage(chatId, msg);
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export default {
  sendMessage,
  sendMessageWithKeyboard,
  sendMessageWithInlineKeyboard,
  editMessage,
  editMessageWithInlineKeyboard,
  deleteMessage,
  answerCallbackQuery,
  sendChatAction,
  setWebhook,
  deleteWebhook,
  getWebhookInfo,
  sendMultipleMessages,
};
