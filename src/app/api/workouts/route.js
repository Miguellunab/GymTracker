import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

function getMode(request) {
    if (!request.cookies) {
        return 'main';
    }
    return request.cookies.get('app_mode')?.value ?? 'main';
}

export async function GET(request) {
    try {
        const prisma = getPrisma(getMode(request));
        const history = await prisma.workoutSession.findMany({
            orderBy: { date: 'desc' },
            include: {
                sets: {
                    include: { exercise: true }
                }
            }
        });
        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const prisma = getPrisma(getMode(request));
        const body = await request.json();
        const { routineName, date, notes, didCardio, cardioMinutes, cardioIntensity, workoutData, durationSeconds, totalCalories } = body;
        
        // workoutData is expected to be { exerciseId: [ { weight, reps, ... } ] }
        
        // Flatten sets
        const setsToCreate = [];
        
        Object.entries(workoutData).forEach(([exerciseId, sets]) => {
            sets.forEach(set => {
                setsToCreate.push({
                    exerciseId: exerciseId,
                    weight: Number(set.weight),
                    reps: Number(set.reps),
                    isWarmup: set.isWarmup || false,
                    weight2: set.weight2 ? Number(set.weight2) : null,
                    reps2: set.reps2 ? Number(set.reps2) : null,
                });
            });
        });

        const session = await prisma.workoutSession.create({
            data: {
                routineName,
                date: date ? new Date(date) : new Date(),
                notes,
                didCardio,
                cardioMinutes: didCardio ? Number(cardioMinutes) : null,
                cardioIntensity: didCardio ? cardioIntensity : null,
                durationSeconds,
                totalCalories,
                sets: {
                    create: setsToCreate
                }
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error("Save Error:", error);
        return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
    }
}
