import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const banners = await prisma.adBanner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ banners });
    } catch (error) {
        return NextResponse.json({ error: "광고 조회 오류" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const banner = await prisma.adBanner.create({
            data: {
                title: data.title,
                script: data.script,
                isActive: data.isActive,
                position: data.position,
            }
        });
        return NextResponse.json({ success: true, banner });
    } catch (error) {
        return NextResponse.json({ error: "광고 저장 오류" }, { status: 500 });
    }
}
