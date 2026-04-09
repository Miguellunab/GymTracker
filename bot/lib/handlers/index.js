/**
 * Handler Principal del Bot
 * Router de todos los updates de Telegram
 */

import { BOT_CONFIG } from '../constants.js';
import { handleCommand } from './commands.js';
import { handleCallback } from './callbacks.js';
import { handleMessage } from './messages.js';
import { sendMessage } from '../telegram.js';
import { MESSAGES } from '../constants.js';

/**
 * Verifica si el chat está autorizado
 */
function isAuthorized(chatId) {
  if (!BOT_CONFIG.OWNER_CHAT_ID) {
    console.warn('TELEGRAM_OWNER_CHAT_ID not set, allowing all users');
    return true;
  }
  
  return chatId.toString() === BOT_CONFIG.OWNER_CHAT_ID.toString();
}

/**
 * Handler principal de updates
 */
export async function handleUpdate(update) {
  try {
    const disabledMessage = "⚙️ Bot deshabilitado temporalmente por mantenimiento. Me estoy preparando para una integración full con la página web. Nos vemos pronto.";
    
    if (update.message) {
      const chatId = update.message.chat.id;
      if (isAuthorized(chatId)) {
        await sendMessage(chatId, disabledMessage);
      }
      return { ok: true, action: 'disabled_message' };
    }
    
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const callbackQueryId = update.callback_query.id;
      // Note: We'd normally use answerCallbackQuery to dismiss loading
      if (isAuthorized(chatId)) {
        await sendMessage(chatId, disabledMessage);
      }
      return { ok: true, action: 'disabled_callback' };
    }

    return { ok: true, action: 'ignored' };
    
  } catch (error) {
    console.error('Error handling update:', error);
    return { ok: false, error: error.message };
  }
}

export default {
  handleUpdate,
  isAuthorized,
};
