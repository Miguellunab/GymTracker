import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureExerciseCatalog, resolveExerciseEntries } from '@/lib/exercise-catalog';

export async function GET(request) {
  try {
    await ensureExerciseCatalog(prisma);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const date = searchParams.get('date'); // Optional: get specific day

    if (date) {
      // Get session for specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const session = await prisma.workoutSession.findFirst({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        include: { sets: { include: { exercise: true } } }
      });

      return NextResponse.json(session);
    }

    // Get all sessions (paginated)
    const sessions = await prisma.workoutSession.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      include: { sets: { include: { exercise: true } } }
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Workouts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureExerciseCatalog(prisma);
    const body = await request.json();
    const {
      muscleGroup,
      date,
      durationMinutes,
      totalCalories,
      didCardio,
      cardioType,
      cardioMinutes,
      fatigueLevel,
      rirScore,
      feeling,
      notes,
      exercises // Array of { exerciseName, weight, sets, reps }
    } = body;

    if (!muscleGroup) {
      return NextResponse.json({ error: 'muscleGroup is required' }, { status: 400 });
    }

    const exerciseResolutions = await resolveExerciseEntries(prisma, exercises || [], { allowCreateCustom: true });

    const session = await prisma.workoutSession.create({
      data: {
        muscleGroup,
        date: date ? new Date(date) : new Date(),
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        totalCalories: totalCalories ? parseFloat(totalCalories) : null,
        didCardio: didCardio || false,
        cardioType: didCardio ? cardioType : null,
        cardioMinutes: didCardio ? parseInt(cardioMinutes) : null,
        fatigueLevel: fatigueLevel ? parseInt(fatigueLevel) : null,
        rirScore: rirScore !== undefined && rirScore !== null ? parseInt(rirScore) : null,
        feeling,
        notes,
        sets: {
          create: (exercises || []).map((ex, index) => ({
            exerciseId: exerciseResolutions[index]?.status === 'resolved'
              ? exerciseResolutions[index].exerciseId
              : null,
            exerciseName: exerciseResolutions[index]?.status === 'resolved'
              ? exerciseResolutions[index].canonicalName
              : ex.exerciseName,
            originalInput: ex.originalInput || ex.exerciseName,
            weight: parseFloat(ex.weight) || 0,
            sets: parseInt(ex.sets) || 1,
            reps: parseInt(ex.reps) || 1
          }))
        }
      },
      include: { sets: { include: { exercise: true } } }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Workouts POST error:', error);
    return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.workoutSession.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workouts DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}
