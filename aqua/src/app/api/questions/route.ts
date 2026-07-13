import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Q&A 질문 목록 조회
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const take = parseInt(searchParams.get("take") || "20");
        const skip = parseInt(searchParams.get("skip") || "0");
        const tag = searchParams.get("tag");

        const where = tag ? { tag } : {};

        const questions = await prisma.question.findMany({
            where,
            take,
            skip,
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { id: true, name: true, image: true } },
                _count: { select: { answers: true } },
            },
        });

        const total = await prisma.question.count({ where });

        return NextResponse.json({ questions, total, hasMore: skip + take < total });
    } catch (error) {
        console.error("질문 목록 조회 오류:", error);
        return NextResponse.json(
            { error: "질문 목록을 불러오는데 실패했습니다." },
            { status: 500 }
        );
    }
}

// 새 질문 작성
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const { title, content, tag } = await request.json();

        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json(
                { error: "제목과 내용을 입력해주세요." },
                { status: 400 }
            );
        }

        const question = await prisma.question.create({
            data: {
                title: title.trim(),
                content: content.trim(),
                tag: tag || null,
                authorId: session.user.id,
            },
            include: {
                author: { select: { id: true, name: true, image: true } },
            },
        });

        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        console.error("질문 작성 오류:", error);
        return NextResponse.json(
            { error: "질문 작성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
