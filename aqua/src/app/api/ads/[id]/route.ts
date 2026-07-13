import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const data = await request.json();
        const banner = await prisma.adBanner.update({
            where: { id: Number(params.id) },
            data: { isActive: data.isActive }
        });
        return NextResponse.json({ success: true, banner });
    } catch (error) {
        return NextResponse.json({ error: "광고 업데이트 오류" }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        await prisma.adBanner.delete({
            where: { id: Number(params.id) }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "광고 삭제 오류" }, { status: 500 });
    }
}
