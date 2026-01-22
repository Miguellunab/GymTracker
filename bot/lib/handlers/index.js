/**
 * Handler Principal del Bot
 * Router de todos los updates de Telegram
 */

import { BOT_CONFIG } from '../constants.js';
import { handleCommand } from './commands.js';
import { handleCallback } from './callbacks.js';
import { handleMessage } from './messages.js';
import { checkAndNotifyTimer } from './timer.js';
import { sendMessage } from '../telegram.js';
import { MESSAGES } from '../constants.js';

/**
 * Verifica si el chat está autorizado
 */
function isAuthorized(chatId) {
  // Si no hay OWNER_CHAT_ID configurado, permitir a todos (para desarrollo)
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
    // Mensaje normal
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';
      
      // Verificar autorización
      if (!isAuthorized(chatId)) {
        await sendMessage(chatId, MESSAGES.UNAUTHORIZED);
        return { ok: true, action: 'unauthorized' };
      }
      
      // IMPORTANTE: Verificar timer en cada interacción
      await checkAndNotifyTimer(chatId);
      
      // Comando
      if (text.startsWith('/')) {
        const [command, ...args] = text.split(' ');
        await handleCommand(chatId, command.toLowerCase(), args.join(' '));
        return { ok: true, action: 'command', command };
      }
      
      // Mensaje de texto normal
      await handleMessage(chatId, text);
      return { ok: true, action: 'message' };
    }
    
    // Callback de botón inline
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;
      const callbackData = update.callback_query.data;
      const callbackQueryId = update.callback_query.id;
      
      // Verificar autorización
      if (!isAuthorized(chatId)) {
        return { ok: true, action: 'unauthorized' };
      }
      
      // IMPORTANTE: Verificar timer en cada interacción
      await checkAndNotifyTimer(chatId);
      
      await handleCallback(chatId, messageId, callbackData, callbackQueryId);
      return { ok: true, action: 'callback', data: callbackData };
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
