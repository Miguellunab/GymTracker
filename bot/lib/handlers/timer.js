/**
 * Handler del Timer de Descanso
 * 
 * Usa la base de datos para persistir timers (serverless-compatible)
 * Un cron job cada minuto chequea y envía notificaciones
 */

import { sendMessage } from '../telegram.js';
import { EMOJI } from '../constants.js';
import prisma from '../../../src/lib/prisma.js';

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
 * Inicia un timer de descanso (guarda en DB)
 */
export async function startTimer(chatId, minutes) {
  const now = new Date();
  const endTime = new Date(now.getTime() + (minutes * 60 * 1000));
  
  // Upsert: crear o actualizar timer para este chat
  await prisma.telegramTimer.upsert({
    where: { chatId: String(chatId) },
    update: { 
      endTime,
      minutes,
      createdAt: now
    },
    create: {
      chatId: String(chatId),
      endTime,
      minutes
    }
  });
  
  const endTimeStr = formatTime(endTime);
  
  const message = `${EMOJI.TIMER} *Timer de ${minutes} minuto${minutes > 1 ? 's' : ''} iniciado*

⏰ Termina a las: *${endTimeStr}*

_Recibirás una notificación automática cuando termine._`;
  
  await sendMessage(chatId, message);
  
  return true;
}

/**
 * Cancela un timer activo
 */
export async function cancelTimer(chatId) {
  const deleted = await prisma.telegramTimer.deleteMany({
    where: { chatId: String(chatId) }
  });
  
  if (deleted.count > 0) {
    await sendMessage(chatId, `${EMOJI.TIMER} Timer cancelado.`);
    return true;
  }
  
  await sendMessage(chatId, `No hay timer activo.`);
  return false;
}

/**
 * Verifica si hay un timer activo
 */
export async function hasActiveTimer(chatId) {
  const timer = await prisma.telegramTimer.findUnique({
    where: { chatId: String(chatId) }
  });
  return timer != null;
}

/**
 * Obtiene info del timer activo
 */
export async function getTimerInfo(chatId) {
  const timer = await prisma.telegramTimer.findUnique({
    where: { chatId: String(chatId) }
  });
  
  if (!timer) return null;
  
  const endTime = new Date(timer.endTime);
  const now = new Date();
  const remainingMs = endTime - now;
  
  if (remainingMs <= 0) {
    return { finished: true, remaining: 0, minutes: timer.minutes };
  }
  
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  
  return {
    finished: false,
    remaining: remainingSec,
    remainingFormatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    endTimeFormatted: formatTime(endTime),
    totalMinutes: timer.minutes
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
  // Soportar formato "M:SS" o solo minutos
  let minutes;
  
  if (minutesText.includes(':')) {
    const [mins, secs] = minutesText.split(':').map(Number);
    minutes = mins + (secs / 60);
  } else {
    minutes = parseFloat(minutesText);
  }
  
  if (isNaN(minutes) || minutes < 0.5 || minutes > 30) {
    await sendMessage(chatId, 'Ingresa un número entre 0.5 y 30 minutos (ej: 1:30 o 2)');
    return false;
  }
  
  await startTimer(chatId, minutes);
  return true;
}

/**
 * Chequea todos los timers expirados y envía notificaciones
 * Esta función es llamada por el cron job
 */
export async function checkExpiredTimers() {
  const now = new Date();
  
  // Buscar timers que ya expiraron
  const expiredTimers = await prisma.telegramTimer.findMany({
    where: {
      endTime: { lte: now }
    }
  });
  
  const results = [];
  
  for (const timer of expiredTimers) {
    try {
      // Enviar notificación
      await sendMessage(timer.chatId, `${EMOJI.BELL} *¡DESCANSO TERMINADO!*

Han pasado ${timer.minutes} minuto${timer.minutes > 1 ? 's' : ''}. ¡Hora de la siguiente serie! 💪`);
      
      // Eliminar el timer
      await prisma.telegramTimer.delete({
        where: { id: timer.id }
      });
      
      results.push({ chatId: timer.chatId, success: true });
    } catch (error) {
      console.error(`Error notifying timer ${timer.id}:`, error);
      results.push({ chatId: timer.chatId, success: false, error: error.message });
    }
  }
  
  return results;
}

export default {
  startTimer,
  cancelTimer,
  hasActiveTimer,
  getTimerInfo,
  handleTimerCallback,
  handleCustomTimer,
  checkExpiredTimers,
};
