import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

function getMode(request) {
    return request.cookies?.get('app_mode')?.value ?? 'main';
}

export async function GET(request, { params }) {
    const { id } = params;
    try {
        const prisma = getPrisma(getMode(request));
        const routine = await prisma.routine.findUnique({
            where: { id },
            include: {
                exercises: {
                    orderBy: { order: 'asc' },
                    include: { exercise: true }
                }
            }
        });
        return NextResponse.json(routine);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { id } = params;
    const body = await request.json();
    const { exercises } = body; // expect [{ exerciseId, order }]
    
    try {
        const prisma = getPrisma(getMode(request));
        // Rebuild the routine exercises
        // Transaction: Delete all existing, then create new ones
        await prisma.$transaction(async (tx) => {
            // 1. Delete all current routine exercises
            await tx.routineExercise.deleteMany({
                where: { routineId: id }
            });

            // 2. Create new ones from the list
            if (exercises && exercises.length > 0) {
                 await tx.routineExercise.createMany({
                    data: exercises.map((ex, index) => ({
                        routineId: id,
                        exerciseId: ex.exerciseId,
                        order: index
                    }))
                 });
            }
        });
        
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
