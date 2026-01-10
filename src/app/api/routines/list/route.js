import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const routines = await prisma.routine.findMany({
            include: {
                _count: {
                    select: { exercises: true }
                }
            }
        });
        return NextResponse.json(routines);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
