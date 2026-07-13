"use client";

import { useState, useMemo } from "react";
import { FishCardWithCategory } from "@/components/ui/PokemonCard";
import { FishCard, FishEXData } from "@/components/FishCard";
import Link from "next/link";
import { Fish, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HomeGalleryClientProps {
    initialCards: FishCardWithCategory[];
    adBannerSlot1?: React.ReactNode;
    adBannerSlot2?: React.ReactNode;
}

import { mapToEXData } from "@/lib/utils/fishFormatters";

export default function HomeGalleryClient({ initialCards, adBannerSlot1, adBannerSlot2 }: HomeGalleryClientProps) {
    const categories = ["전체", "담수어", "해수어", "양서류", "무척추동물", "수초"];
    const grades = ["전체", "기본", "고정", "희귀", "브리딩"];

    const [selectedCategory, setSelectedCategory] = useState("전체");
    const [selectedGrade, setSelectedGrade] = useState("전체");
    const [searchQuery, setSearchQuery] = useState("");

    const categoryMap: Record<string, string> = {
        "담수어": "freshwater",
        "해수어": "saltwater",
        "양서류": "amphibians",
        "무척추동물": "invertebrates",
        "수초": "plants"
    };

    const exDataCards: { card: FishCardWithCategory, exData: FishEXData }[] = useMemo(() => {
        return initialCards.map(card => ({
            card,
            exData: mapToEXData(card)
        }));
    }, [initialCards]);

    const filteredCards = useMemo(() => {
        return exDataCards.filter(({ card, exData }) => {
            // 1. Search filter
            const matchesSearch = searchQuery === "" ||
                card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (card.description && card.description.toLowerCase().includes(searchQuery.toLowerCase()));

            // 2. Category filter
            let matchesCategory = true;
            if (selectedCategory !== "전체") {
                const targetSlug = categoryMap[selectedCategory];
                matchesCategory = card.category?.slug === targetSlug || (card as any).categorySlug === targetSlug;
            }

            // 3. Grade filter
            const matchesGrade = selectedGrade === "전체" || exData.grade === selectedGrade;

            return matchesSearch && matchesCategory && matchesGrade;
        });
    }, [exDataCards, searchQuery, selectedCategory, selectedGrade]);

    return (
        <>
            {/* Hero / Filter Section */}
            <section className="text-center py-8">
                <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight bg-gradient-to-br from-slate-100 to-slate-500 bg-clip-text text-transparent">
                    어떤 생물을 찾으시나요?
                </h1>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-8 px-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="어종 이름이나 설명을 검색해 보세요. (예: 구피, 초보수초)"
                            className="block w-full pl-11 pr-4 py-4 bg-slate-900/80 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner text-base lg:text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filter Area */}
                <div className="max-w-4xl mx-auto px-4 flex flex-col gap-4">

                    {/* Category Filter */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 min-w-[70px]">
                            <Filter className="w-4 h-4" /> 분류
                        </span>
                        <div className="flex flex-wrap justify-center gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${selectedCategory === category
                                        ? "bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] border border-blue-400 scale-105"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grade Filter */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 min-w-[70px]">
                            <Filter className="w-4 h-4" /> 등급
                        </span>
                        <div className="flex flex-wrap justify-center gap-2">
                            {grades.map((grade) => (
                                <button
                                    key={grade}
                                    onClick={() => setSelectedGrade(grade)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${selectedGrade === grade
                                        ? "text-white shadow-md scale-105 border " + (
                                            grade === "기본" ? "bg-slate-500 border-slate-400" :
                                                grade === "고정" ? "bg-blue-500 border-blue-400" :
                                                    grade === "희귀" ? "bg-fuchsia-500 border-fuchsia-400" :
                                                        grade === "브리딩" ? "bg-amber-500 border-amber-400" :
                                                            "bg-indigo-600 border-indigo-400" // 전체
                                        )
                                        : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                                        }`}
                                >
                                    {grade}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {adBannerSlot1}

            {/* Grid List */}
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between mb-8 px-2">
                    <h2 className="text-2xl font-bold flex items-center">
                        <span className="w-2 h-8 rounded-full bg-blue-500 mr-3 block"></span>
                        인기 어종 도감
                    </h2>
                    <span className="text-slate-500 text-sm whitespace-nowrap">{filteredCards.length}개의 등록된 정보</span>
                </div>

                {/* Cards Grid or Empty State */}
                {filteredCards.length > 0 ? (
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 justify-items-center">
                        <AnimatePresence mode="popLayout">
                            {filteredCards.map(({ card, exData }) => (
                                <motion.div
                                    key={card.id}
                                    layout
                                    className="w-full max-w-[320px] mx-auto"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ opacity: { duration: 0.2 }, layout: { duration: 0.3 } }}
                                >
                                    <Link href={`/fish/${card.id}`} className="block w-full">
                                        <FishCard fish={exData} />
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24 bg-slate-900/30 rounded-3xl border border-slate-800/50 text-center px-4 backdrop-blur-sm"
                    >
                        <Search className="w-16 h-16 text-slate-600 mb-6 drop-shadow-md" />
                        <p className="text-white text-xl font-bold mb-2">검색 결과가 없습니다.</p>
                        <p className="text-slate-400 text-base mb-6">다른 검색어나 필터 조건으로 다시 시도해 보세요.</p>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedCategory("전체");
                                setSelectedGrade("전체");
                            }}
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-full transition-colors border border-slate-700"
                        >
                            모든 조건 초기화
                        </button>
                    </motion.div>
                )}
            </section>

            {filteredCards.length > 0 && adBannerSlot2}
        </>
    );
}
