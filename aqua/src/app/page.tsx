import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import HomeGalleryClient from "@/components/HomeGalleryClient";
import AdBannerSlot from "@/components/AdBannerSlot";

export const dynamic = "force-dynamic";

/**
 * 목록 허브의 표준 URL은 슬래시 없는 형태로 고정한다.
 *
 * 레이아웃의 canonical './' 는 이 페이지에서 "/aqua/" 로 해석되는데,
 * 그 주소는 308 로 "/aqua" 되돌아온다. 표준 URL 이 리다이렉트를 가리키면
 * 신호가 충돌해 색인이 "발견됨" 단계에서 멈출 수 있다.
 */
export const metadata: Metadata = {
    alternates: { canonical: "https://soritok.com/aqua" },
};

/**
 * 목록 카드가 실제로 쓰는 값만 가져온다.
 *
 * 예전에는 `include: { category: true }` 만 주고 전 컬럼을 읽어, 카드마다
 * 백과사전 본문 6개(detailHistory/Appearance/Care/Breeding/Disease/Companionship,
 * 각 300~800자)가 통째로 클라이언트 페이로드에 실렸다. 205종 기준 HTML 4.1MB.
 * 종이 매일 10개씩 늘어나므로 그대로 두면 계속 커진다.
 *
 * 카드가 본문에서 실제로 쓰는 건 두 가지뿐이다(fishFormatters.mapToEXData 참고):
 *   detailCare    앞 100자만 (사육 지침 미리보기)
 *   detailDisease 값이 있는지 여부만 (약점 표시)
 * 그래서 이 둘은 LEFT()/존재여부로 줄여서 읽는다 — DB 전송량도 같이 준다.
 */
async function fetchGalleryCards() {
  const cards = await prisma.fishCard.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      name: true,
      scientificName: true,
      baseSpecies: true,
      variantName: true,
      grade: true,
      difficultyLevel: true,
      pokedexEntry: true,
      temp: true,
      ph: true,
      diet: true,
      minTank: true,
      companionship: true,
      maxSize: true,
      imageUrl: true,
      communityImageUrl: true,
      createdAt: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const excerpts = await prisma.$queryRaw<{ id: number; care: string | null; hasDisease: number }[]>`
    SELECT id,
           LEFT(detailCare, 120) AS care,
           (detailDisease IS NOT NULL AND detailDisease <> '') AS hasDisease
    FROM FishCard
    WHERE isPublished = true
  `;
  const byId = new Map(excerpts.map((e) => [e.id, e]));

  return cards.map((c) => {
    const e = byId.get(c.id);
    return {
      ...c,
      detailCare: e?.care ?? null,
      // 카드는 "질병 정보가 있는가"만 보므로 본문 대신 표식만 넘긴다
      detailDisease: e && Number(e.hasDisease) ? "있음" : null,
    };
  });
}

export default async function Home() {
  const cards = await fetchGalleryCards();

  return (
    <div className="flex flex-col gap-12">
      <HomeGalleryClient
        initialCards={cards as never}
        adBannerSlot1={<AdBannerSlot />}
        adBannerSlot2={<AdBannerSlot />}
      />
    </div>
  );
}
