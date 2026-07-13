import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// 질문 상세 조회
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const question = await prisma.question.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, name: true, image: true } },
                answers: {
                    include: {
                        author: { select: { id: true, name: true, image: true } },
                    },
                    orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
                },
                _count: { select: { answers: true } },
            },
        });

        if (!question) {
            return NextResponse.json(
                { error: "질문을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        return NextResponse.json(question);
    } catch (error) {
        console.error("질문 상세 조회 오류:", error);
        return NextResponse.json(
            { error: "질문을 불러오는데 실패했습니다." },
            { status: 500 }
        );
    }
}

// 질문 삭제
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const { id } = await params;
        const question = await prisma.question.findUnique({
            where: { id },
            select: { authorId: true },
        });

        if (!question) {
            return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
        }

        if (question.authorId !== session.user.id && session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
        }

        await prisma.question.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "질문이 삭제되었습니다." });
    } catch (error) {
        console.error("질문 삭제 오류:", error);
        return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
    }
}
