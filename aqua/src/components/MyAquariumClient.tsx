"use client";

import { useAquariumStore } from "@/store/useAquariumStore";
import { FishCardWithCategory } from "@/lib/utils/fishFormatters";
import { FishCard, FishEXData } from "@/components/FishCard";
import { mapToEXData } from "@/lib/utils/fishFormatters";
import Link from "next/link";
import { HeartCrack, Fish } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VirtualAquarium from "@/components/VirtualAquarium";
import { useEffect, useState, useMemo } from "react";

interface MyAquariumClientProps {
    initialCards: FishCardWithCategory[];
}

export default function MyAquariumClient({ initialCards }: MyAquariumClientProps) {
    const savedFishIds = useAquariumStore(state => state.savedFishIds);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Process all cards, but only keep the ones whose IDs are in savedFishIds
    const savedCards = useMemo(() => {
        if (!mounted) return [];
        return initialCards
            .filter((card) => savedFishIds.includes(card.id))
            .map((card) => ({
                id: card.id,
                exData: mapToEXData(card)
            }));
    }, [initialCards, savedFishIds, mounted]);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <section className="animate-in fade-in py-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight text-white flex items-center justify-center gap-3">
                    내 어항
                    <span className="text-pink-500 bg-pink-500/10 px-3 py-1 rounded-full text-2xl border border-pink-500/30">
                        {savedCards.length}
                    </span>
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                    도감에 추가한 어종들이 어항 속에서 헤엄칩니다. 악세사리로 나만의 수족관을 꾸며보세요.
                </p>
            </div>

            {/* 살아 움직이는 가상 어항 */}
            <VirtualAquarium
                fish={savedCards.map(({ id, exData }) => ({
                    id,
                    name: exData.name,
                    imageUrl: exData.imageUrl || "/aqua/images/default-fish.png",
                }))}
            />

            {savedCards.length > 0 ? (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center px-2">
                    <AnimatePresence mode="popLayout">
                        {savedCards.map(({ id, exData }) => (
                            <motion.div
                                key={id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ opacity: { duration: 0.2 }, layout: { duration: 0.3 } }}
                                className="relative group"
                            >
                                <Link href={`/fish/${id}`}>
                                    <FishCard fish={exData} />
                                </Link>

                                {/* Quick remove button overlays the card on hover */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        useAquariumStore.getState().removeFish(id);
                                    }}
                                    className="absolute -top-3 -right-3 bg-slate-900 border border-slate-700 text-slate-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white hover:border-red-500 shadow-xl z-20"
                                    aria-label="어항에서 빼기"
                                    title="어항에서 빼기"
                                >
                                    <HeartCrack className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-24 bg-slate-900/30 rounded-3xl border border-slate-800/50 text-center px-4 backdrop-blur-sm mx-4 max-w-4xl mx-auto"
                >
                    <div className="relative mb-6">
                        <Fish className="w-20 h-20 text-slate-700" />
                        <HeartCrack className="w-8 h-8 text-slate-600 absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1" />
                    </div>
                    <p className="text-white text-2xl font-bold mb-3">내 어항이 비어있습니다.</p>
                    <p className="text-slate-400 text-base mb-8 max-w-md">
                        마음에 드는 어종 카드를 찾았다면 상세 페이지에서 '어항에 담기' 하트 버튼을 눌러보세요!
                    </p>
                    <Link
                        href="/"
                        className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold rounded-full transition-all shadow-lg shadow-blue-500/25 hover:scale-105"
                    >
                        도감 둘러보기
                    </Link>
                </motion.div>
            )}
        </section>
    );
}
