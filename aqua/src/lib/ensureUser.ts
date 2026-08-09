import { prisma } from "@/lib/prisma";

type SessionLike = {
    user?: { id?: string | null; email?: string | null; name?: string | null; image?: string | null } | null;
};

/**
 * aqua 의 User 는 위클리(소리톡 통합 계정)의 미러다. 로그인 시 mirrorUser 가
 * 행을 만들지만, 세션이 JWT(무상태)라 DB 쪽 미러가 사라져도 세션은 그대로 살아
 * 있다. 그 상태에서 글/댓글/도감 등록을 하면 userId 외래키 위반(P2003)으로
 * 500 이 난다. 쓰기 직전에 미러를 보증해 스스로 복구한다.
 */
export async function ensureLocalUser(session: SessionLike): Promise<string | null> {
    const id = session?.user?.id;
    if (!id) return null;

    const byId = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (byId) return byId.id;

    const email = session.user?.email || `${id}@soritok.local`;
    // 같은 이메일의 레거시 로컬 계정이 있으면 그 행을 쓴다(중복 생성 방지)
    const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (byEmail) return byEmail.id;

    const created = await prisma.user.create({
        data: {
            id,
            email,
            name: session.user?.name || email.split("@")[0],
            image: session.user?.image || null,
        },
        select: { id: true },
    });
    return created.id;
}
