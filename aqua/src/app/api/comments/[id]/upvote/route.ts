import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: '로그인이 필요한 서비스입니다.' }, { status: 401 });
        }

        const resolvedParams = await params;
        const commentId = parseInt(resolvedParams.id);
        if (isNaN(commentId)) {
            return NextResponse.json({ error: '유효하지 않은 댓글 ID입니다.' }, { status: 400 });
        }

        const userId = session.user.id;

        // 트랜잭션으로 처리하여 일관성 유지
        const result = await prisma.$transaction(async (tx) => {
            // 1. 해당 댓글이 존재하는지, 그리고 어떤 FishCard에 속하는지 확인
            const comment = await tx.comment.findUnique({
                where: { id: commentId },
                select: { id: true, fishCardId: true, upvotes: true, imageUrl: true }
            });

            if (!comment) {
                throw new Error('댓글을 찾을 수 없습니다.');
            }

            // 2. 이미 추천했는지 확인
            const existingUpvote = await tx.commentUpvote.findUnique({
                where: {
                    userId_commentId: {
                        userId,
                        commentId,
                    }
                }
            });

            let isUpvoted = false;
            let currentUpvotes = comment.upvotes;

            if (existingUpvote) {
                // 추천 취소
                await tx.commentUpvote.delete({
                    where: { id: existingUpvote.id }
                });
                await tx.comment.update({
                    where: { id: commentId },
                    data: { upvotes: { decrement: 1 } }
                });
                currentUpvotes -= 1;
                isUpvoted = false;
            } else {
                // 추천 추가
                await tx.commentUpvote.create({
                    data: {
                        userId,
                        commentId,
                    }
                });
                await tx.comment.update({
                    where: { id: commentId },
                    data: { upvotes: { increment: 1 } }
                });
                currentUpvotes += 1;
                isUpvoted = true;
            }

            // 3. 사진이 있는 댓글이라면 FishCard의 대표 이미지 업데이트 로직 실행
            if (comment.imageUrl && comment.fishCardId) {
                // 해당 FishCard의 사진이 있는 모든 댓글 중 가장 추천이 많은 댓글 하나 조회 (최소 5개 이상 추천)
                const BEST_COMMENT_THRESHOLD = 5;

                const bestComment = await tx.comment.findFirst({
                    where: {
                        fishCardId: comment.fishCardId,
                        imageUrl: { not: null },
                        upvotes: { gte: BEST_COMMENT_THRESHOLD }
                    },
                    orderBy: { upvotes: 'desc' }
                });

                if (bestComment && bestComment.imageUrl) {
                    await tx.fishCard.update({
                        where: { id: comment.fishCardId },
                        data: { imageUrl: bestComment.imageUrl }
                    });
                }
            }

            return { isUpvoted, upvotes: currentUpvotes };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error toggling comment upvote:', error);
        return NextResponse.json({ error: error.message || '추천 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
