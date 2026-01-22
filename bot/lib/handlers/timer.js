/**
 * Handler del Timer de Descanso
 * Lógica de countdown y notificaciones
 */

import { sendMessage, editMessage, deleteMessage } from '../telegram.js';
import { MESSAGES, REST_TIMES, EMOJI } from '../constants.js';
import { setTimerRef, clearTimer, getTimerRef, hasActiveTimer, getState } from '../state.js';
import { getTimerCancelKeyboard } from '../keyboards/inline.js';

// Almacén de timers activos (en memoria)
const activeTimers = new Map();

/**
 * Inicia un timer de descanso
 */
export async function startTimer(chatId, minutes) {
  // Cancelar timer existente si hay uno
  if (hasActiveTimer(chatId)) {
    await cancelTimer(chatId);
  }
  
  const seconds = minutes * 60;
  const endTime = Date.now() + (seconds * 1000);
  
  // Enviar mensaje inicial con botón de cancelar
  const initialMsg = await sendMessage(chatId, formatTimerMessage(seconds), {
    reply_markup: {
      inline_keyboard: getTimerCancelKeyboard()
    }
  });
  
  if (!initialMsg) return false;
  
  const messageId = initialMsg.message_id;
  
  // Crear el timer
  const timerData = {
    chatId,
    messageId,
    endTime,
    intervalId: null,
    timeoutId: null,
  };
  
  // Actualizar cada 30 segundos
  timerData.intervalId = setInterval(async () => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    
    if (remaining > 0) {
      await editMessage(chatId, messageId, formatTimerMessage(remaining), {
        reply_markup: {
          inline_keyboard: getTimerCancelKeyboard()
        }
      });
    }
  }, 30000);
  
  // Timer para el final
  timerData.timeoutId = setTimeout(async () => {
    // Limpiar intervalo
    if (timerData.intervalId) {
      clearInterval(timerData.intervalId);
    }
    
    // Eliminar de activos
    activeTimers.delete(chatId);
    clearTimer(chatId);
    
    // Editar mensaje final
    await editMessage(chatId, messageId, `${EMOJI.BELL} *Timer completado*`);
    
    // Enviar notificación sonora (mensaje nuevo para que suene)
    await sendMessage(chatId, MESSAGES.TIMER_FINISHED, {
      disable_notification: false, // Asegurar que suene
    });
    
  }, seconds * 1000);
  
  // Guardar referencia
  activeTimers.set(chatId, timerData);
  setTimerRef(chatId, timerData, messageId);
  
  return true;
}

/**
 * Cancela un timer activo
 */
export async function cancelTimer(chatId) {
  const timerData = activeTimers.get(chatId);
  
  if (timerData) {
    // Limpiar intervalos
    if (timerData.intervalId) {
      clearInterval(timerData.intervalId);
    }
    if (timerData.timeoutId) {
      clearTimeout(timerData.timeoutId);
    }
    
    // Editar mensaje
    await editMessage(chatId, timerData.messageId, `${EMOJI.TIMER} Timer cancelado`);
    
    // Limpiar
    activeTimers.delete(chatId);
    clearTimer(chatId);
    
    return true;
  }
  
  return false;
}

/**
 * Formatea el mensaje del timer
 */
function formatTimerMessage(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Barra de progreso visual
  const progressBar = createProgressBar(totalSeconds);
  
  return `${EMOJI.TIMER} *Descanso*\n\n\`${timeStr}\`\n\n${progressBar}`;
}

/**
 * Crea una barra de progreso visual
 */
function createProgressBar(remainingSeconds) {
  // Asumimos max 5 min = 300 seg
  const maxSeconds = 300;
  const percentage = Math.min(100, (remainingSeconds / maxSeconds) * 100);
  const filledBlocks = Math.round(percentage / 10);
  const emptyBlocks = 10 - filledBlocks;
  
  return '`[' + '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks) + ']`';
}

/**
 * Verifica si hay un timer activo para un chat
 */
export function hasTimer(chatId) {
  return activeTimers.has(chatId);
}

/**
 * Obtiene el tiempo restante de un timer
 */
export function getRemainingTime(chatId) {
  const timerData = activeTimers.get(chatId);
  if (!timerData) return null;
  
  const remaining = Math.max(0, Math.ceil((timerData.endTime - Date.now()) / 1000));
  return remaining;
}

/**
 * Handler para botón de timer desde callback
 */
export async function handleTimerCallback(chatId, action, callbackQueryId) {
  if (action === 'timer_cancel') {
    const cancelled = await cancelTimer(chatId);
    return cancelled ? 'Timer cancelado' : 'No hay timer activo';
  }
  
  // Parsear minutos del callback (timer_3, timer_4, timer_5)
  const minutesMatch = action.match(/timer_(\d+)/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    await startTimer(chatId, minutes);
    return `Timer de ${minutes} minutos iniciado`;
  }
  
  return null;
}

/**
 * Handler para input de timer custom
 */
export async function handleCustomTimer(chatId, minutesText) {
  const minutes = parseInt(minutesText);
  
  if (isNaN(minutes) || minutes < 1 || minutes > 30) {
    await sendMessage(chatId, 'Ingresa un numero entre 1 y 30 minutos.');
    return false;
  }
  
  await startTimer(chatId, minutes);
  return true;
}

export default {
  startTimer,
  cancelTimer,
  hasTimer,
  getRemainingTime,
  handleTimerCallback,
  handleCustomTimer,
};
