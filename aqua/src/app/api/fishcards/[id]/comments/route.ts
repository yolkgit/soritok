import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const fishCardId = parseInt(resolvedParams.id);
        const session = await getServerSession(authOptions);

        if (isNaN(fishCardId)) {
            return NextResponse.json({ error: '유효하지 않은 FishCard ID입니다.' }, { status: 400 });
        }

        const comments = await prisma.comment.findMany({
            where: { fishCardId },
            include: {
                author: {
                    select: { name: true, image: true, id: true }
                },
                upvotedBy: session?.user?.id ? {
                    where: { userId: session.user.id },
                    select: { id: true }
                } : false
            },
            orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
            take: 50 // Limit comments to prevent too much load
        });

        // Add `isUpvoted` boolean for frontend convenience
        const formattedComments = comments.map(comment => {
            const { upvotedBy, ...rest } = comment;
            return {
                ...rest,
                isUpvoted: upvotedBy && upvotedBy.length > 0
            };
        });

        return NextResponse.json(formattedComments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: '댓글을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

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
        const fishCardId = parseInt(resolvedParams.id);
        if (isNaN(fishCardId)) {
            return NextResponse.json({ error: '유효하지 않은 FishCard ID입니다.' }, { status: 400 });
        }

        const body = await request.json();
        const { content, imageUrl } = body;

        if (!content || typeof content !== 'string' || content.trim() === '') {
            return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 });
        }

        const newComment = await prisma.comment.create({
            data: {
                content: content.trim(),
                imageUrl: imageUrl || null,
                authorId: session.user.id,
                fishCardId,
            },
            include: {
                author: {
                    select: { name: true, image: true, id: true }
                }
            }
        });

        return NextResponse.json({ ...newComment, isUpvoted: false }, { status: 201 });
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: '댓글을 작성하는 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
