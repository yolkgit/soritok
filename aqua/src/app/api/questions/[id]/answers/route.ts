import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { ensureLocalUser } from "@/lib/ensureUser";
// 답변 작성
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        // JWT 세션은 무상태라 미러 User 가 없을 수 있다 — 쓰기 전에 보증(FK 위반 방지)
        await ensureLocalUser(session);

        const { id: questionId } = await params;
        const { content } = await request.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: "답변 내용을 입력해주세요." }, { status: 400 });
        }

        // 질문이 존재하는지 확인
        const question = await prisma.question.findUnique({
            where: { id: questionId },
        });

        if (!question) {
            return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
        }

        const answer = await prisma.answer.create({
            data: {
                content: content.trim(),
                authorId: session.user.id,
                questionId,
            },
            include: {
                author: { select: { id: true, name: true, image: true } },
            },
        });

        return NextResponse.json(answer, { status: 201 });
    } catch (error) {
        console.error("답변 작성 오류:", error);
        return NextResponse.json({ error: "답변 작성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
