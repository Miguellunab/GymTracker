import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureExerciseCatalog, getExerciseSuggestions, getExerciseSnapshot, resolveExerciseInput } from '@/lib/exercise-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await ensureExerciseCatalog(prisma);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const mode = searchParams.get('mode') || 'suggest';

    if (mode === 'snapshot') {
      const snapshot = await getExerciseSnapshot(prisma, query);
      return NextResponse.json(snapshot);
    }

    if (mode === 'resolve') {
      const resolution = await resolveExerciseInput(prisma, query, { allowCreateCustom: false });
      return NextResponse.json(resolution);
    }

    const suggestions = await getExerciseSuggestions(prisma, query, 8);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Exercises GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}
