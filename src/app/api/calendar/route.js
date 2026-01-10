import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to get start/end of day
const getDayRange = (dateString) => {
    const start = new Date(dateString);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateString);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

export async function GET(request) {
    try {
        // Just return all sessions mapping date -> status
        const sessions = await prisma.workoutSession.findMany({
            select: {
                id: true,
                date: true,
                routineName: true
            }
        });
        
        // Transform to friendly format: "YYYY-MM-DD": "RoutineName"
        const calendarData = {};
        sessions.forEach(s => {
            const d = new Date(s.date).toISOString().split('T')[0];
            calendarData[d] = {
                id: s.id,
                title: s.routineName,
            };
        });

        return NextResponse.json(calendarData);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request) {
    // Manually setting a status (e.g. "Rest")
    try {
        const { date, type } = await request.json(); // type = "Descanso", "Pierna", etc.
        const { start, end } = getDayRange(date);

        // Check if exists
        const existing = await prisma.workoutSession.findFirst({
            where: {
                date: { gte: start, lte: end }
            }
        });

        if (existing) {
            // Update
            if (type === 'Descanso') {
                // If changing to Rest, we should essentially wipe the "workout" part but keep the record stating it's a rest day.
                // Or verify if user wants to delete history? 
                // "si yo luego cambio el martes por descanso deberia desaparecer del historial"
                // "Desaparecer del historial" suggests deleting the session logic, 
                // but we still want to see "Descanso" in calendar.
                // So we delete sets and stats.
                await prisma.workoutSet.deleteMany({ where: { workoutSessionId: existing.id } });
                await prisma.workoutSession.update({
                    where: { id: existing.id },
                    data: { 
                        routineName: 'Descanso',
                        durationSeconds: 0,
                        totalCalories: 0,
                        didCardio: false,
                        cardioMinutes: null,
                        cardioIntensity: null,
                        notes: null
                    }
                });
            } else {
                 await prisma.workoutSession.update({
                    where: { id: existing.id },
                    data: { routineName: type }
                });
            }

        } else {
            // Create "Empty" session
             await prisma.workoutSession.create({
                data: {
                    date: new Date(date), // Ensure correct time, maybe noon to be safe
                    routineName: type,
                    didCardio: false
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        
        if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 });

        const { start, end } = getDayRange(date);

        await prisma.workoutSession.deleteMany({
            where: {
                date: { gte: start, lte: end }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
         return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
