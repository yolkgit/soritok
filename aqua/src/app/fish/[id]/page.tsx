import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { mapToEXData } from "@/lib/utils/fishFormatters";
import { ArrowLeft, Star, Thermometer, Droplet, Fish, Maximize, Activity, BookOpen, Dna, Waves, Heart, HeartPulse, Shield } from "lucide-react";
import Link from "next/link";
import { FishCardWithCategory } from "@/lib/utils/fishFormatters";
import AddAquariumButton from "@/components/AddAquariumButton";
import AddOwnsButton from "@/components/AddOwnsButton";
import ShareButton from "@/components/ShareButton";
import CommentSection from "@/components/comments/CommentSection";

interface FishDetailsProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FishDetailsProps): Promise<Metadata> {
    const resolvedParams = await params;
    const fish = await prisma.fishCard.findUnique({
        where: { id: parseInt(resolvedParams.id, 10) },
    }) as any;

    if (!fish) {
        return { title: "어종을 찾을 수 없습니다 - Aquado" };
    }

    return {
        title: `${fish.name} - Aquado 어종 도감`,
        description: fish.pokedexEntry?.slice(0, 150) || `${fish.name}의 상세한 사육 정보와 생태 환경을 확인하세요.`,
    };
}

export default async function FishDetailsPage({ params }: FishDetailsProps) {
    const resolvedParams = await params;

    // Fetch individual fish data
    const fishData = await prisma.fishCard.findUnique({
        where: { id: parseInt(resolvedParams.id, 10) },
        include: { category: true },
    }) as any as FishCardWithCategory;

    if (!fishData || !fishData.isPublished) {
        notFound();
    }

    const exData = mapToEXData(fishData);

    const displayName = fishData.variantName && fishData.variantName !== "없음" && fishData.variantName !== fishData.name
        ? `${fishData.name} (${fishData.variantName})`
        : fishData.name;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pt-0 pb-32 selection:bg-blue-500/30 font-sans">

            {/* 1. Hero Section */}
            <section className="relative w-full h-[50vh] min-h-[400px] bg-slate-900 border-b border-white/10">
                {/* Global Back Nav */}
                <div className="absolute top-6 left-6 z-30">
                    <Link href="/" className="inline-flex items-center text-white/90 bg-black/40 hover:bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full transition-all group border border-white/10 shadow-lg">
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold text-sm tracking-wide">도감 목록으로</span>
                    </Link>
                </div>

                {/* Floating Actions - 왼쪽부터: 공유, 내 어항에 담기(OWNS), 좋아요(WANTS) */}
                <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
                    <div className="backdrop-blur-md rounded-full shadow-lg">
                        <ShareButton
                            title={`${fishData.name} - Aquado 도감`}
                            text={`${fishData.name} 관련 상세 위키 정보를 확인해보세요!`}
                        />
                    </div>
                    <div className="backdrop-blur-md rounded-full shadow-lg">
                        <AddOwnsButton fishId={fishData.id} />
                    </div>
                    <div className="backdrop-blur-md rounded-full shadow-lg">
                        <AddAquariumButton fishId={fishData.id} />
                    </div>
                </div>

                {/* Hero Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src={fishData.imageUrl || "/aqua/images/default-fish.png"}
                        alt={fishData.name}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/20" />
                </div>

                {/* Hero Text */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20">
                    <div className="max-w-5xl mx-auto flex flex-col items-start gap-3">
                        {/* 뱃지 */}
                        <span className={`px-4 py-1.5 text-xs font-black tracking-widest rounded-full border shadow-2xl backdrop-blur-md ${exData.grade === '기본' ? 'bg-slate-900/80 text-slate-300 border-slate-600' :
                            exData.grade === '고정' ? 'bg-blue-950/80 text-blue-400 border-blue-500' :
                                exData.grade === '희귀' ? 'bg-fuchsia-950/80 text-fuchsia-400 border-fuchsia-500' :
                                    'bg-amber-950/80 text-amber-400 border-amber-500'
                            }`}>
                            {exData.grade} 등급
                        </span>

                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] break-keep leading-tight">
                            {displayName}
                        </h1>

                        <p className="text-xl md:text-3xl text-slate-300/90 font-mono italic tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                            {fishData.scientificName || "Unknown Species"}
                        </p>
                    </div>
                </div>
            </section>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 relative z-30">

                {/* 2. Quick Stats Panel */}
                <section className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl -mt-12 backdrop-blur-xl mb-16">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                            <span className="text-xs font-bold text-slate-500 mb-2">사육 난이도</span>
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className={`w-4 h-4 sm:w-5 sm:h-5 ${star <= fishData.difficultyLevel ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-slate-800"}`} />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                            <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mb-2 drop-shadow-md" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mb-1">적정 수온</span>
                            <span className="text-sm font-bold text-slate-200">{fishData.temp}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                            <Droplet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mb-2 drop-shadow-md" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mb-1">수질 (pH)</span>
                            <span className="text-sm font-bold text-slate-200">{fishData.ph}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                            <Fish className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 mb-2 drop-shadow-md" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mb-1">주 먹이</span>
                            <span className="text-sm font-bold text-slate-200 text-center">{fishData.diet}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                            <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mb-2 drop-shadow-md" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mb-1">최소 수조</span>
                            <span className="text-sm font-bold text-slate-200">{fishData.minTank}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-blue-900/20 rounded-2xl border border-blue-800/50 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
                            <Maximize className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] sm:text-xs font-bold text-blue-300/80 mb-1">성체 크기</span>
                            <span className="text-sm font-black text-blue-100">{fishData.maxSize}</span>
                        </div>
                    </div>
                </section>

                {/* 3. Wiki Content */}
                <section className="space-y-12 sm:space-y-16 text-slate-300 leading-relaxed tracking-wide text-lg">

                    {fishData.pokedexEntry && (
                        <div className="border-l-4 border-blue-500 pl-6 py-4 bg-gradient-to-r from-blue-950/30 to-transparent rounded-r-2xl">
                            <p className="font-semibold italic text-xl text-slate-200 m-0 leading-loose break-keep">
                                "{fishData.pokedexEntry}"
                            </p>
                        </div>
                    )}

                    <article>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-amber-400 drop-shadow-sm" />
                            기원 및 역사
                        </h2>
                        <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                            <p className="whitespace-pre-wrap break-keep">{fishData.detailHistory || "해당 어종에 대한 기원 및 역사 정보가 아직 작성되지 않았습니다."}</p>
                        </div>
                    </article>

                    <hr className="border-slate-800/80" />

                    <article>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
                            <Dna className="w-8 h-8 text-fuchsia-400 drop-shadow-sm" />
                            외형 및 특징
                        </h2>
                        <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                            <p className="whitespace-pre-wrap break-keep">{fishData.detailAppearance || "외형 및 색상 변이, 체형 특징에 대한 정보가 아직 작성되지 않았습니다."}</p>
                        </div>
                    </article>

                    <hr className="border-slate-800/80" />

                    <article>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
                            <Waves className="w-8 h-8 text-cyan-400 drop-shadow-sm" />
                            수조 세팅 및 사육 환경
                        </h2>
                        <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                            <p className="whitespace-pre-wrap break-keep">{fishData.detailCare || "해당 생물을 가장 쾌적하게 기를 수 있는 수조 환경 구성 가이드가 필요합니다."}</p>
                        </div>
                    </article>

                    <hr className="border-slate-800/80" />

                    <article>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
                            <Heart className="w-8 h-8 text-pink-400 drop-shadow-sm" />
                            브리딩 노하우
                        </h2>
                        <div className="bg-pink-950/10 p-6 sm:p-8 rounded-3xl border border-pink-900/30">
                            <div className="prose prose-invert prose-lg max-w-none text-slate-200">
                                <p className="whitespace-pre-wrap break-keep m-0">{fishData.detailBreeding || "암수 구분, 번식 유도, 치어 관리 등의 브리딩 노하우가 곧 업데이트될 예정입니다."}</p>
                            </div>
                        </div>
                    </article>

                    <hr className="border-slate-800/80" />

                    <article>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
                            <HeartPulse className="w-8 h-8 text-red-500 drop-shadow-sm" />
                            질병 및 대처법
                        </h2>
                        <div className="bg-red-950/10 p-6 sm:p-8 rounded-3xl border border-red-900/30">
                            <div className="prose prose-invert prose-lg max-w-none text-red-100">
                                <p className="whitespace-pre-wrap break-keep m-0">{fishData.detailDisease || "자주 걸리기 쉬운 수족관 질병과 예방법, 치료법에 대한 지식을 모아두는 곳입니다."}</p>
                            </div>
                        </div>
                    </article>

                    <hr className="border-slate-800/80" />

                    <article>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 flex items-center gap-3">
                            <Shield className="w-8 h-8 text-emerald-400 drop-shadow-sm" />
                            합사 및 성향 가이드
                        </h2>
                        <div className="bg-emerald-950/10 p-6 sm:p-8 rounded-3xl border border-emerald-900/30">
                            <div className="prose prose-invert prose-lg max-w-none text-emerald-100">
                                <p className="whitespace-pre-wrap break-keep m-0">{fishData.detailCompanionship || "이 생물과 함께 기르면 좋은 추천 어종 및 금기 어종에 대한 가이드입니다."}</p>
                            </div>
                        </div>
                    </article>

                    {/* Comments Section */}
                    <CommentSection fishCardId={fishData.id} />

                </section>

            </main>
        </div>
    );
}
