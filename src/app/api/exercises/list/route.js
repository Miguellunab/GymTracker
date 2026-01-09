import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const exercises = await prisma.exercise.findMany({
             orderBy: { name: 'asc' }
        });
        return NextResponse.json(exercises);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
