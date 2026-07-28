import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * 아쿠아도 사이트맵 (/aqua/sitemap.xml)
 *
 * 어종 상세는 매일 자동 생성되어 계속 늘어나므로 DB 에서 직접 읽는다.
 * 빌드 시점에 고정하면 새 어종이 반영되지 않고, 도커 빌드 중에는 DB 에
 * 접근할 수 없어 빌드가 깨지므로 요청 시점에 생성한다.
 */
export const dynamic = 'force-dynamic';

// 실제 서비스 오리진. 과거 값(aquado.com)은 존재하지 않는 도메인이라
// 사이트맵의 모든 URL 이 죽은 링크였다.
const BASE = 'https://soritok.com/aqua';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: BASE, changeFrequency: 'daily', priority: 1 },
        { url: `${BASE}/collection`, changeFrequency: 'weekly', priority: 0.6 },
        { url: `${BASE}/community`, changeFrequency: 'daily', priority: 0.6 },
        { url: `${BASE}/qna`, changeFrequency: 'daily', priority: 0.6 },
        { url: `${BASE}/about`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE}/contact`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    ];

    try {
        // 상세 페이지가 비공개 카드를 404 로 처리하므로 같은 조건으로 맞춘다
        const fish = await prisma.fishCard.findMany({
            where: { isPublished: true },
            select: { id: true, updatedAt: true },
            orderBy: { id: 'asc' },
        });

        return [
            ...staticRoutes,
            ...fish.map((f) => ({
                url: `${BASE}/fish/${f.id}`,
                lastModified: f.updatedAt,
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            })),
        ];
    } catch {
        // DB 를 못 읽어도 사이트맵 자체는 유효하게 응답한다
        return staticRoutes;
    }
}
