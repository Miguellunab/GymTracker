/**
 * Handler del Timer de Descanso
 * 
 * NOTA: En Vercel serverless los setTimeout no persisten entre requests.
 * Solución: Mostrar hora de finalización y verificar en cada interacción.
 */

import { sendMessage } from '../telegram.js';
import { EMOJI } from '../constants.js';
import { getState, updateData } from '../state.js';

// Zona horaria Colombia (UTC-5)
const TIMEZONE = 'America/Bogota';

/**
 * Formatea hora en zona horaria de Colombia
 */
function formatTime(date) {
  return date.toLocaleTimeString('es-CO', { 
    timeZone: TIMEZONE,
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
}

/**
 * Inicia un timer de descanso
 */
export async function startTimer(chatId, minutes) {
  const now = new Date();
  const endTime = new Date(now.getTime() + (minutes * 60 * 1000));
  
  // Guardar en estado
  updateData(chatId, { 
    activeTimer: {
      endTime: endTime.toISOString(),
      minutes: minutes,
      startTime: now.toISOString()
    }
  });
  
  const endTimeStr = formatTime(endTime);
  
  const message = `${EMOJI.TIMER} *Timer de ${minutes} minutos iniciado*

⏰ Termina a las: *${endTimeStr}*

_Te avisaré cuando interactúes con el bot. Puedes seguir usándolo normalmente._`;
  
  await sendMessage(chatId, message);
  
  return true;
}

/**
 * Verifica si hay un timer activo y si ya terminó
 * Llamar esto en cada interacción del usuario
 */
export async function checkAndNotifyTimer(chatId) {
  const state = getState(chatId);
  const timer = state.data?.activeTimer;
  
  if (!timer) return false;
  
  const endTime = new Date(timer.endTime);
  const now = new Date();
  
  if (now >= endTime) {
    // Timer terminó - notificar
    updateData(chatId, { activeTimer: null });
    
    await sendMessage(chatId, `${EMOJI.BELL} *¡DESCANSO TERMINADO!*

Han pasado ${timer.minutes} minutos. ¡Hora de la siguiente serie! 💪`, {
      disable_notification: false
    });
    
    return true;
  }
  
  return false;
}

/**
 * Cancela un timer activo
 */
export async function cancelTimer(chatId) {
  const state = getState(chatId);
  const timer = state.data?.activeTimer;
  
  if (timer) {
    updateData(chatId, { activeTimer: null });
    await sendMessage(chatId, `${EMOJI.TIMER} Timer cancelado.`);
    return true;
  }
  
  await sendMessage(chatId, `No hay timer activo.`);
  return false;
}

/**
 * Verifica si hay un timer activo
 */
export function hasActiveTimer(chatId) {
  const state = getState(chatId);
  return state.data?.activeTimer != null;
}

/**
 * Obtiene info del timer activo
 */
export function getTimerInfo(chatId) {
  const state = getState(chatId);
  const timer = state.data?.activeTimer;
  
  if (!timer) return null;
  
  const endTime = new Date(timer.endTime);
  const now = new Date();
  const remainingMs = endTime - now;
  
  if (remainingMs <= 0) {
    return { finished: true, remaining: 0 };
  }
  
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  
  return {
    finished: false,
    remaining: remainingSec,
    remainingFormatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    endTimeFormatted: formatTime(endTime)
  };
}

/**
 * Handler para callback de timer
 */
export async function handleTimerCallback(chatId, action) {
  if (action === 'timer_cancel') {
    await cancelTimer(chatId);
    return 'Timer cancelado';
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
  checkAndNotifyTimer,
  hasActiveTimer,
  getTimerInfo,
  handleTimerCallback,
  handleCustomTimer,
};
