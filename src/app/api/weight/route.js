import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const logs = await prisma.weightLog.findMany({
            orderBy: { date: 'desc' }
        });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { weight, date } = await request.json();
        const log = await prisma.weightLog.create({
            data: {
                weight: Number(weight),
                date: date ? new Date(date) : new Date()
            }
        });
        return NextResponse.json(log);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
