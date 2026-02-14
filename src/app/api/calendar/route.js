import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
        nitRating: true,
        didCardio: true
      },
      orderBy: { date: 'asc' }
    });

    // Transform to calendar-friendly format: { "YYYY-MM-DD": { ...data } }
    const calendarData = {};
    sessions.forEach(s => {
      const d = new Date(s.date).toISOString().split('T')[0];
      calendarData[d] = {
        id: s.id,
        muscleGroup: s.muscleGroup,
        calories: s.totalCalories || 0,
        duration: s.durationMinutes || 0,
        fatigue: s.fatigueLevel || 0,
        nit: s.nitRating || 0,
        didCardio: s.didCardio
      };
    });

    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}
