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
        const exercises = await prisma.exercise.findMany({
             orderBy: { name: 'asc' }
        });
        return NextResponse.json(exercises);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
