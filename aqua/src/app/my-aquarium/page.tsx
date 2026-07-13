import { prisma } from "@/lib/prisma";
import MyAquariumClient from "@/components/MyAquariumClient";

export const dynamic = "force-dynamic";

export default async function MyAquariumPage() {
    const cards = await prisma.fishCard.findMany({
        where: { isPublished: true },
        include: { category: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="flex flex-col gap-12">
            <MyAquariumClient initialCards={cards as any} />
        </div>
    );
}
