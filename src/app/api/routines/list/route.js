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
