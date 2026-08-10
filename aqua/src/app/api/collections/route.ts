import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { ensureLocalUser } from "@/lib/ensureUser";
// 내 컬렉션 조회
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const collections = await prisma.userCollection.findMany({
            where: { userId: session.user.id },
            include: {
                fishCard: {
                    select: {
                        id: true,
                        name: true,
                        scientificName: true,
                        imageUrl: true,
                        communityImageUrl: true,
                        cutoutImageUrl: true,
                        imageFacing: true,
                        swimLayer: true,
                        activityLevel: true,
                        maxSize: true,
                        difficultyLevel: true,
                        grade: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // OWNS와 WANTS로 분리
        const owns = collections.filter((c) => c.type === "OWNS");
        const wants = collections.filter((c) => c.type === "WANTS");

        return NextResponse.json({ owns, wants });
    } catch (error) {
        console.error("컬렉션 조회 오류:", error);
        return NextResponse.json({ error: "컬렉션을 불러오는데 실패했습니다." }, { status: 500 });
    }
}

// 찜하기 토글
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        // JWT 세션은 무상태라 미러 User 가 없을 수 있다 — 쓰기 전에 보증(FK 위반 방지)
        await ensureLocalUser(session);

        const { fishCardId, type } = await request.json();

        if (!fishCardId || !["OWNS", "WANTS"].includes(type)) {
            return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
        }

        // 이미 등록된 항목인지 확인
        const existing = await prisma.userCollection.findUnique({
            where: {
                userId_fishCardId_type: {
                    userId: session.user.id,
                    fishCardId: parseInt(fishCardId),
                    type,
                },
            },
        });

        if (existing) {
            // 이미 있으면 제거 (토글 해제)
            await prisma.userCollection.delete({ where: { id: existing.id } });
            return NextResponse.json({ added: false, type });
        } else {
            // 없으면 추가
            await prisma.userCollection.create({
                data: {
                    userId: session.user.id,
                    fishCardId: parseInt(fishCardId),
                    type,
                },
            });
            return NextResponse.json({ added: true, type });
        }
    } catch (error) {
        console.error("찜하기 오류:", error);
        return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
