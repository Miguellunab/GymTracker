import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH: Actualizar un workout (duración, calorías, etc.)
export async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        
        const { durationSeconds, totalCalories } = body;

        const updated = await prisma.workoutSession.update({
            where: { id: id }, // Usar el ID como string directamente
            data: {
                durationSeconds,
                totalCalories,
            }
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

// DELETE: Eliminar un workout (por si acaso lo necesitas después)
export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        await prisma.workoutSession.delete({
            where: { id: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting workout:', error);
        return NextResponse.json(
            { error: 'Failed to delete workout' },
            { status: 500 }
        );
    }
}
