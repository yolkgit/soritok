import { prisma } from "@/lib/prisma";
import ClientAdWrapper from "./ClientAdWrapper";

export default async function AdBannerSlot({ position = "bottom" }: { position?: string }) {
    // Fetch active ads for the specified position
    let activeAds: any[] = [];
    try {
        activeAds = await prisma.adBanner.findMany({
            where: {
                isActive: true,
                position: position,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    } catch (error) {
        console.warn("Could not connect to database for AdBannerSlot, likely during build time.");
    }

    if (activeAds.length === 0) return null;

    // We can pick a random ad or just the first active one. Let's pick the latest one here.
    const adToDisplay = activeAds[0];

    return (
        <div className="w-full flex justify-center py-6 px-4">
            <div className="w-full max-w-4xl min-h-[100px] bg-slate-900 border border-slate-700/50 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full absolute top-2 right-2 border border-slate-700 z-10">
                    AD
                </span>
                <div className="w-full h-full flex items-center justify-center relative z-0">
                    <ClientAdWrapper scriptHtml={adToDisplay.script} />
                </div>
            </div>
        </div>
    );
}
