import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ status: "connected" });
    } catch (error) {
        console.error("DB Connection Error:", error);
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
