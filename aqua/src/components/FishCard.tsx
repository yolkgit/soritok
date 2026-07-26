"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Droplet, Thermometer, Droplets, Fish as FishIcon, Skull, Shield, Box, AlertTriangle, Leaf, Moon, Sun } from "lucide-react";

export interface FishEXData {
    grade: "기본" | "고정" | "희귀" | "브리딩";
    baseSpecies?: string | null;
    variantName?: string | null;
    name: string;
    scientificName: string;
    maxSize: string;
    imageUrl: string;
    element: "water" | "plant" | "dark" | "light"; // For icon color
    difficultyLevel: number;

    // Info Body
    temperament: string; // 성향 (e.g., 평화로움, 소심함)
    pokedexEntry: string; // 도감 설명
    conditions: {
        temp: string;
        ph: string;
        diet: string;
    };

    // Footer Stats
    weakness: string; // 질병/취약점
    resistance: string; // 합사 난이도
    minTank: string; // 최저 권장 수조
    retreatCost: number; // 별(난이도) 개수로 쓰는 변성용 (1~5)

    // EX Rule Box
    warnings: string; // 주의사항
}

interface FishCardProps {
    fish: FishEXData;
    className?: string;
}

export function FishCard({ fish, className }: FishCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse position values for 3D Tilt
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth springs for rotation
    const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

    // Glare effect transforms
    const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [100, 0]), springConfig);
    const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [100, 0]), springConfig);
    const glareBackgroundPosition = useTransform(glareX, (x) => `${x - 50}% ${x}%`);

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    }

    function handleMouseEnter() {
        setIsHovered(true);
    }

    function handleMouseLeave() {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
    }

    // Grade-based background styles
    let gradeBg = "from-slate-400 via-slate-200 to-slate-500";
    let gradeText = "text-slate-800";
    let gradeBorder = "border-slate-500";

    switch (fish.grade) {
        case "고정": // Fixed/Uncommon
            gradeBg = "from-blue-500 via-cyan-300 to-blue-700";
            gradeText = "text-blue-900";
            gradeBorder = "border-blue-400";
            break;
        case "희귀": // Rare EX Style
            gradeBg = "from-purple-600 via-fuchsia-400 to-rose-600";
            gradeText = "text-purple-950";
            gradeBorder = "border-fuchsia-300";
            break;
        case "브리딩": // Breeding/Special
            gradeBg = "from-amber-400 via-yellow-200 to-orange-500";
            gradeText = "text-amber-900";
            gradeBorder = "border-amber-300";
            break;
    }

    // Element Icon
    const ElementIcon = () => {
        switch (fish.element) {
            case "water": return <Droplet className="w-[6.25cqw] h-[6.25cqw] text-blue-500 drop-shadow-md fill-blue-500" />;
            case "plant": return <Leaf className="w-[6.25cqw] h-[6.25cqw] text-emerald-500 drop-shadow-md fill-emerald-500" />;
            case "dark": return <Moon className="w-[6.25cqw] h-[6.25cqw] text-indigo-800 drop-shadow-md fill-indigo-800" />;
            case "light": return <Sun className="w-[6.25cqw] h-[6.25cqw] text-yellow-400 drop-shadow-md fill-yellow-400" />;
            default: return <Droplet className="w-[6.25cqw] h-[6.25cqw] text-gray-400 fill-gray-400" />;
        }
    };

    return (
        <div className={cn("perspective-1000 flex items-center justify-center p-4", className)}>
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    // @container: 카드 폭(최대 320px)을 기준 컨테이너로 삼는다.
                    // 내부 글자·아이콘을 cqw 로 지정해 카드가 좁아져도 비율이 유지되어
                    // 고정 비율(63/88) 안에서 내용이 잘리지 않는다.
                    "@container relative w-full max-w-[320px] aspect-[63/88] rounded-2xl shadow-2xl overflow-hidden cursor-pointer",
                    "bg-gradient-to-br", gradeBg,
                    "ring-1 ring-black/20"
                )}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                    boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 0 0 6px rgba(255, 255, 255, 0.4), inset 0 0 20px 6px rgba(0, 0, 0, 0.2)"
                }}
            >
                {/* Holographic Glare Overlay (mix-blend-color-dodge) */}
                {isHovered && (
                    <motion.div
                        className="pointer-events-none absolute inset-0 z-40 mix-blend-color-dodge opacity-80"
                        style={{
                            background: `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.7) 25%, transparent 30%, transparent 40%, rgba(255,150,255,0.6) 45%, transparent 50%)`,
                            backgroundPosition: glareBackgroundPosition,
                            backgroundSize: "200% 200%",
                        }}
                    />
                )}

                {isHovered && ( // Secondary Glare
                    <motion.div
                        className="pointer-events-none absolute inset-0 z-40 mix-blend-overlay opacity-50"
                        style={{
                            background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 60%)`,
                        }}
                    />
                )}

                <div className="relative w-full h-full flex flex-col z-10 group bg-slate-900 rounded-2xl overflow-hidden" style={{ transform: "translateZ(20px)" }}>

                    {/* ================= TOP BAR ================= */}
                    <div className="w-full bg-slate-800/80 border-b border-slate-700 flex justify-between items-center px-2 py-1 flex-shrink-0 z-20 shadow-sm">
                        <div className="flex-[0.8] flex justify-start">
                            <div className={cn("px-1.5 py-0.5 text-[2.66cqw] font-black uppercase tracking-widest text-white border rounded-[3px] shadow-sm", gradeBorder, gradeBg)} style={{ WebkitTextStroke: "0.5px rgba(0,0,0,0.4)" }}>
                                {fish.grade}
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center items-center">
                            <span className="font-extrabold text-white tracking-widest text-[3.75cqw] drop-shadow-sm whitespace-nowrap">
                                {fish.baseSpecies || fish.name}
                            </span>
                        </div>
                        <div className="flex-[0.8] flex justify-end items-center gap-0.5 text-yellow-500 drop-shadow-sm">
                            {[...Array(Math.max(1, Math.min(5, fish.difficultyLevel || 1)))].map((_, i) => (
                                <span key={i} className="text-[3.13cqw] font-black">★</span>
                            ))}
                        </div>
                    </div>

                    {/* ================= IMAGE BOX ================= */}
                    <div className="relative w-full h-[40%] flex-shrink-0 overflow-hidden bg-slate-950 border-b border-white/10 border-slate-800">
                        {fish.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={fish.imageUrl}
                                alt={fish.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                <FishIcon className="w-[25cqw] h-[25cqw] mb-2 opacity-30" />
                                <span className="text-[4.38cqw] font-black tracking-widest opacity-50">이미지 추가중</span>
                            </div>
                        )}

                        <div className="absolute bottom-1 right-1 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-full backdrop-blur-sm border border-white/20 shadow-lg">
                                <ElementIcon />
                            </div>
                        </div>
                    </div>

                    {/* ================= BOTTOM INFO BOX ================= */}
                    <div className="w-full flex-1 bg-slate-900 flex flex-col relative">

                        {/* Name Section (Variant + Scientific) & Pokedex Entry */}
                        <div className="px-3 pt-2 pb-1.5 flex-shrink-0 bg-gradient-to-b from-slate-800/40 to-transparent">
                            <div className="flex items-end justify-between gap-1 mb-1">
                                <h2 className="text-[1.1rem] font-black text-white tracking-tighter leading-tight break-keep" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                                    {fish.variantName || fish.name}
                                </h2>
                                <p className="text-[2.66cqw] text-white/50 font-mono italic tracking-tight text-right truncate max-w-[50%]">
                                    {fish.scientificName}
                                </p>
                            </div>
                            <p className="text-[3.13cqw] text-slate-300 font-light tracking-tight leading-relaxed line-clamp-4">
                                {fish.pokedexEntry}
                            </p>
                        </div>

                        {/* Middle Info sections */}
                        <div className="px-3 flex-shrink-0 border-t border-white/5 mt-1 mb-1.5">
                            {/* Grid below pokedex inline */}
                            <div className="grid grid-cols-2 gap-1.5 w-full">
                                <div className="flex items-center gap-1.5 bg-slate-950/50 rounded p-0.5 shadow-inner border border-white/5">
                                    <Thermometer className="w-[3.75cqw] h-[3.75cqw] text-red-500 flex-shrink-0" />
                                    <span className="text-[2.81cqw] font-light text-slate-200 truncate leading-none">{fish.conditions.temp}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-950/50 rounded p-0.5 shadow-inner border border-white/5">
                                    <Droplets className="w-[3.75cqw] h-[3.75cqw] text-blue-500 flex-shrink-0" />
                                    <span className="text-[2.81cqw] font-light text-slate-200 truncate leading-none">{fish.conditions.ph}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer EX Box */}
                        <div className="flex-1 flex flex-col bg-slate-950 border-t border-slate-800">
                            {/* Stats - 넉넉한 높이로 시각적 균형 */}
                            <div className="flex justify-between items-stretch px-2 py-2 text-[2.81cqw] text-slate-400 tracking-tighter border-b border-slate-800">
                                <div className="flex flex-col items-center justify-center flex-1 gap-1.5">
                                    <span className="uppercase opacity-70 leading-none text-[2.5cqw]">질병/약점</span>
                                    <div className="flex items-center gap-1">
                                        <Skull className="w-[3.75cqw] h-[3.75cqw] text-slate-500" />
                                        <span className={`truncate max-w-[70px] font-bold leading-none ${fish.weakness.includes('오염') || fish.weakness.includes('주의') ? 'text-red-400' : 'text-slate-300'}`}>{fish.weakness}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center flex-1 border-x border-slate-800 gap-1.5">
                                    <span className="uppercase opacity-70 leading-none text-[2.5cqw]">합사 난이도</span>
                                    <div className="flex items-center gap-1">
                                        <Shield className="w-[3.75cqw] h-[3.75cqw] text-slate-500" />
                                        <span className={`truncate max-w-[70px] font-bold leading-none ${fish.resistance.includes('가능') ? 'text-emerald-400' : 'text-orange-400'}`}>{fish.resistance}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center flex-1 gap-1.5">
                                    <span className="uppercase opacity-70 leading-none text-[2.5cqw]">권장수조</span>
                                    <div className="flex items-center gap-1 overflow-hidden w-full justify-center px-1">
                                        <Box className="w-[3.75cqw] h-[3.75cqw] text-blue-400 flex-shrink-0" />
                                        <span className="text-slate-300 font-bold truncate leading-none text-center inline-block">{fish.minTank}</span>
                                    </div>
                                </div>
                            </div>

                            {/* EX Rule Box */}
                            <div className="flex-1 bg-gradient-to-b from-slate-900 to-black px-2 py-2 text-white/90 flex items-start gap-1.5 overflow-hidden">
                                <div className="w-[6.25cqw] h-[3.75cqw] bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-600 text-black font-black flex items-center justify-center rounded-[2px] text-[2.19cqw] flex-shrink-0 border border-yellow-200 mt-0.5" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>EX</div>
                                <div className="text-[2.66cqw] leading-tight flex-1 h-full overflow-hidden flex flex-col">
                                    <span className="font-black text-yellow-500 mr-1 tracking-widest block mb-0.5 flex-shrink-0">사육 지침</span>
                                    <span className="font-light text-slate-400 line-clamp-4">{fish.warnings}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </motion.div>
        </div>
    );
}
