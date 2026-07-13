import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const postId = resolvedParams.id;

        if (!postId) {
            return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: { select: { name: true, image: true, id: true } },
                _count: { select: { comments: true, likes: true } },
            },
        });

        if (!post) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json(post);
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json({ error: "게시물을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const resolvedParams = await params;
        const postId = resolvedParams.id;

        if (!postId) {
            return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });

        if (!post) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
        }

        // 작성자 본인 또는 관리자만 삭제 가능
        if (post.authorId !== session.user.id && session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
        }

        await prisma.post.delete({
            where: { id: postId },
        });

        return NextResponse.json({ success: true, message: "게시글이 삭제되었습니다." });
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json({ error: "게시글 삭제 중 오류가 발생했습니다." }, { status: 500 });
    }
}
