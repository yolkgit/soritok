import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { ensureLocalUser } from "@/lib/ensureUser";
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const take = parseInt(searchParams.get("take") || "10");
        const skip = parseInt(searchParams.get("skip") || "0");

        const posts = await prisma.post.findMany({
            take,
            skip,
            orderBy: { createdAt: "desc" },
            include: {
                author: {
                    select: { name: true, image: true, id: true },
                },
                _count: {
                    select: { comments: true, likes: true },
                },
            },
        });

        const total = await prisma.post.count();

        return NextResponse.json({
            posts,
            total,
            hasMore: skip + take < total,
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return NextResponse.json(
            { error: "게시글을 불러오는데 실패했습니다." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json(
                { error: "로그인이 필요한 서비스입니다." },
                { status: 401 }
            );
        }

        // JWT 세션은 무상태라 미러 User 가 없을 수 있다 — 쓰기 전에 보증(FK 위반 방지)
        await ensureLocalUser(session);

        const { title, content, imageUrl } = await request.json();

        if (!title || !content) {
            return NextResponse.json(
                { error: "제목과 내용을 입력해주세요." },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                title,
                content,
                imageUrl: imageUrl || null,
                authorId: session.user.id,
            },
            include: {
                author: { select: { id: true, name: true, image: true } },
            },
        });

        return NextResponse.json(post, { status: 201 });
    } catch (error) {
        console.error("Error creating post:", error);
        return NextResponse.json(
            { error: "게시글 작성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
