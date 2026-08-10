"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fish, Heart, BookMarked, Sparkles } from "lucide-react";
import VirtualAquarium from "@/components/VirtualAquarium";

interface CollectionFishCard {
    id: number;
    name: string;
    scientificName: string;
    imageUrl: string;
    communityImageUrl?: string | null;
    cutoutImageUrl?: string | null;
    imageFacing?: string | null;
    swimLayer?: string | null;
    activityLevel?: string | null;
    maxSize?: string | null;
    difficultyLevel: number;
    grade: string;
}

interface CollectionItem {
    id: string;
    type: string;
    createdAt: string;
    fishCard: CollectionFishCard;
}

export default function MyCollectionPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [owns, setOwns] = useState<CollectionItem[]>([]);
    const [wants, setWants] = useState<CollectionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"OWNS" | "WANTS">("OWNS");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (session) fetchCollections();
    }, [session]);

    const fetchCollections = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/aqua/api/collections");
            if (res.ok) {
                const data = await res.json();
                setOwns(data.owns);
                setWants(data.wants);
            }
        } catch (error) {
            console.error("컬렉션 로드 실패:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (fishCardId: number, type: string) => {
        try {
            const res = await fetch("/aqua/api/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fishCardId, type }),
            });
            if (res.ok) {
                fetchCollections();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const currentList = activeTab === "OWNS" ? owns : wants;

    if (status === "loading" || isLoading) {
        return (
            <div className="max-w-3xl mx-auto py-20 text-center text-slate-500">
                도감을 불러오는 중...
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            {/* 헤더 */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-jamsil flex items-center gap-3 text-white">
                    <BookMarked className="w-8 h-8 text-pink-400" />
                    나만의 도감
                </h1>
                <p className="text-slate-400 mt-2">
                    내가 키우는 물고기와 키우고 싶은 물고기를 모아보세요!
                </p>
            </div>

            {/* 내 어항 — "키우는 중"인 물고기가 헤엄칩니다 */}
            <VirtualAquarium
                fish={owns.map((item) => ({
                    id: item.fishCard.id,
                    name: item.fishCard.name,
                    // 누끼(배경 제거) 이미지가 있으면 그대로 헤엄치게 한다
                    imageUrl:
                        item.fishCard.cutoutImageUrl ||
                        item.fishCard.communityImageUrl ||
                        item.fishCard.imageUrl ||
                        "/aqua/images/default-fish.png",
                    isCutout: !!item.fishCard.cutoutImageUrl,
                    facing: item.fishCard.imageFacing === "left" ? "left" : "right",
                    layer: (item.fishCard.swimLayer as "top" | "mid" | "bottom") || "mid",
                    activity: (item.fishCard.activityLevel as "calm" | "normal" | "active") || "normal",
                    // 어항 속 크기는 도감의 실제 최대 크기를 기준으로 정해진다
                    maxSize: item.fishCard.maxSize,
                }))}
            />

            {/* 탭 */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab("OWNS")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === "OWNS"
                            ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                            : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        }`}
                >
                    <Fish className="w-5 h-5" />
                    키우는 중 ({owns.length})
                </button>
                <button
                    onClick={() => setActiveTab("WANTS")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === "WANTS"
                            ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                            : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        }`}
                >
                    <Sparkles className="w-5 h-5" />
                    키우고 싶은 ({wants.length})
                </button>
            </div>

            {/* 도감 카드 그리드 */}
            {currentList.length === 0 ? (
                <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                    <p className="text-slate-400 text-lg">
                        {activeTab === "OWNS" ? "아직 등록된 보유 어종이 없습니다." : "아직 찜한 물고기가 없습니다."}
                    </p>
                    <p className="text-slate-500 mt-2">도감에서 물고기를 찜해보세요!</p>
                    <Link
                        href="/"
                        className="inline-block mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600"
                    >
                        도감 둘러보기
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {currentList.map((item) => (
                        <div
                            key={item.id}
                            className="group relative bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-500 transition-all"
                        >
                            <Link href={`/fish/${item.fishCard.id}`}>
                                <div className="aspect-square bg-slate-900 overflow-hidden">
                                    <img
                                        src={item.fishCard.imageUrl}
                                        alt={item.fishCard.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-white text-sm truncate">{item.fishCard.name}</h3>
                                    <p className="text-slate-500 text-xs truncate">{item.fishCard.scientificName}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${i < item.fishCard.difficultyLevel ? "bg-teal-400" : "bg-slate-700"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </Link>
                            {/* 삭제 버튼 */}
                            <button
                                onClick={() => handleRemove(item.fishCard.id, item.type)}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                title="목록에서 제거"
                            >
                                <Heart className="w-4 h-4 fill-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
