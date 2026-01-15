import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

function getMode(request) {
    return request.cookies?.get('app_mode')?.value ?? 'main';
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    try {
        const prisma = getPrisma(getMode(request));
        if (name) {
            const routine = await prisma.routine.findFirst({
                where: { name: name },
                include: {
                    exercises: {
                        orderBy: { order: 'asc' },
                        include: { exercise: true }
                    }
                }
            });
            
            if (!routine) return NextResponse.json(null);

            // Format for UI [ { id, name, muscle, notes, lastLog } ]
            const formatted = await Promise.all(routine.exercises.map(async (re) => {
                // Fetch last set to show prompt
                const lastSet = await prisma.workoutSet.findFirst({
                    where: { exerciseId: re.exercise.id },
                    orderBy: { 
                        session: {
                            createdAt: 'desc'
                        }
                    }
                });

                return {
                    id: re.exercise.id,
                    name: re.exercise.name,
                    muscle: re.exercise.muscleGroup,
                    notes: re.exercise.notes || "",
                    lastWeight: lastSet ? lastSet.weight : null,
                    lastReps: lastSet ? lastSet.reps : null
                };
            }));

            return NextResponse.json({
                name: routine.name,
                exercises: formatted
            });
        }
        
        // Return all names if no specific requested
        const routines = await prisma.routine.findMany();
        return NextResponse.json(routines);

    } catch (error) {
        console.error("Routine Fetch Error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
