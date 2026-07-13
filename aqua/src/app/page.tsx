import { prisma } from "@/lib/prisma";
import HomeGalleryClient from "@/components/HomeGalleryClient";
import AdBannerSlot from "@/components/AdBannerSlot";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cards = await prisma.fishCard.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-12">
      <HomeGalleryClient
        initialCards={cards}
        adBannerSlot1={<AdBannerSlot />}
        adBannerSlot2={<AdBannerSlot />}
      />
    </div>
  );
}
