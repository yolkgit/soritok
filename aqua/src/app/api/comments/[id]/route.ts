import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
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

        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) {
            return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
        }

        if (comment.authorId !== session.user.id && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
        }

        await prisma.comment.delete({
            where: { id: commentId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: '댓글 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
