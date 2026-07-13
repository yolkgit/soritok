import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
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
        const userId = session.user.id;

        if (!postId) {
            return NextResponse.json({ error: "게시글 ID가 누락되었습니다." }, { status: 400 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            return NextResponse.json({ error: "존재하지 않는 게시글입니다." }, { status: 404 });
        }

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId,
                },
            },
        });

        if (existingLike) {
            // 좋아요 취소 (Toggle Off)
            await prisma.like.delete({
                where: { id: existingLike.id },
            });
            return NextResponse.json({ liked: false });
        } else {
            // 좋아요 추가 (Toggle On)
            await prisma.like.create({
                data: {
                    userId,
                    postId,
                },
            });
            return NextResponse.json({ liked: true });
        }
    } catch (error) {
        console.error("Like error:", error);
        return NextResponse.json({ error: "좋아요 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
