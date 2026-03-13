import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureExerciseCatalog } from '@/lib/exercise-catalog';

// PATCH: Update a workout session
export async function PATCH(request, { params }) {
    try {
        await ensureExerciseCatalog(prisma);
        const { id } = params;
        const body = await request.json();

        const updateData = {};
        if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes;
        if (body.totalCalories !== undefined) updateData.totalCalories = body.totalCalories;
        if (body.muscleGroup !== undefined) updateData.muscleGroup = body.muscleGroup;
        if (body.fatigueLevel !== undefined) updateData.fatigueLevel = body.fatigueLevel;
        if (body.rirScore !== undefined) updateData.rirScore = body.rirScore;
        if (body.feeling !== undefined) updateData.feeling = body.feeling;
        if (body.cardioType !== undefined) updateData.cardioType = body.cardioType;
        if (body.didCardio !== undefined) updateData.didCardio = body.didCardio;
        if (body.cardioMinutes !== undefined) updateData.cardioMinutes = body.cardioMinutes;

        const updated = await prisma.workoutSession.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating workout:', error);
        return NextResponse.json(
            { error: 'Failed to update workout' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a workout session
export async function DELETE(request, { params }) {
    try {
        await ensureExerciseCatalog(prisma);
        const { id } = params;

        // Delete related sets first, then the session
        await prisma.workoutSet.deleteMany({ where: { workoutSessionId: id } });
        await prisma.workoutSession.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting workout:', error);
        return NextResponse.json(
            { error: 'Failed to delete workout' },
            { status: 500 }
        );
    }
}
