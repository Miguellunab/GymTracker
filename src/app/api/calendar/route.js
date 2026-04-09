import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const sessions = await prisma.workoutSession.findMany({
      where,
      select: {
        id: true,
        date: true,
        muscleGroup: true,
        totalCalories: true,
        durationMinutes: true,
        fatigueLevel: true,
        rirScore: true,
        didCardio: true
      },
      orderBy: { date: 'asc' }
    });

    const calendarData = {};
    
    // First, map all existing sessions
    sessions.forEach(s => {
      const d = new Date(s.date).toISOString().split('T')[0];
      const sessionType = s.muscleGroup === 'Descanso'
        ? (s.didCardio ? 'active-rest' : 'rest')
        : 'training';

      calendarData[d] = {
        id: s.id,
        muscleGroup: s.muscleGroup,
        calories: s.totalCalories || 0,
        duration: s.durationMinutes || 0,
        fatigue: s.fatigueLevel || 0,
        rir: s.rirScore ?? 0,
        didCardio: s.didCardio,
        sessionType
      };
    });

    // Then, for any day in the requested interval that lacks data, mark as "rest" by default
    if (startDate && endDate) {
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });
      
      const todayStr = new Date().toISOString().split('T')[0];
      
      days.forEach(day => {
        const d = format(day, 'yyyy-MM-dd');
        if (!calendarData[d] && d <= todayStr) {
          calendarData[d] = {
            id: null,
            muscleGroup: 'Descanso',
            calories: 0,
            duration: 0,
            fatigue: 0,
            rir: 0,
            didCardio: false,
            sessionType: 'rest' // Unregistered days default to rest automatically
          };
        }
      });
    }

    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}
