/**
 * Servicio de Calendario
 */

import prisma from '../../../src/lib/prisma.js';
import { MONTH_NAMES, DAY_NAMES, EMOJI } from '../constants.js';

/**
 * Obtiene el calendario de un mes
 */
export async function getMonthCalendar(year, month) {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const workouts = await prisma.workoutSession.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      },
      select: {
        id: true,
        date: true,
        muscleGroup: true,
      },
      orderBy: { date: 'asc' }
    });

    const dayMap = {};
    for (const w of workouts) {
      const day = w.date.getDate();
      dayMap[day] = {
        id: w.id,
        muscleGroup: w.muscleGroup,
        isRest: w.muscleGroup === 'Descanso'
      };
    }

    return {
      year,
      month,
      monthName: MONTH_NAMES[month],
      daysInMonth: endDate.getDate(),
      firstDayOfWeek: (startDate.getDay() + 6) % 7,
      workouts: dayMap
    };
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return null;
  }
}

/**
 * Formatea el calendario como texto para Telegram
 */
export function formatCalendarText(calendarData) {
  const { year, monthName, daysInMonth, firstDayOfWeek, workouts } = calendarData;

  let text = `*${monthName} ${year}*\n\n`;
  text += `\`${DAY_NAMES.join(' ')}\`\n`;
  text += '`─────────────────────`\n';

  let line = '`';
  for (let i = 0; i < firstDayOfWeek; i++) {
    line += '   ';
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calendarData.year && today.getMonth() === calendarData.month;
  const todayDay = today.getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const workout = workouts[day];
    let dayStr = day.toString().padStart(2, ' ');

    if (workout) {
      if (workout.isRest) {
        dayStr = EMOJI.REST.padStart(2, ' ');
      } else {
        dayStr = EMOJI.WORKOUT.padStart(2, ' ');
      }
    } else if (isCurrentMonth && day === todayDay) {
      dayStr = '**';
    }

    line += dayStr + ' ';

    const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
    if (dayOfWeek === 6) {
      text += line + '`\n';
      line = '`';
    }
  }

  if (line !== '`') {
    text += line + '`\n';
  }

  text += '\n';
  text += `${EMOJI.WORKOUT} = Entrenamiento | ${EMOJI.REST} = Descanso | ** = Hoy\n`;

  return text;
}

export default {
  getMonthCalendar,
  formatCalendarText,
};
