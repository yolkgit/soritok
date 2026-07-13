"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";
import { FishCard, Category } from "@prisma/client";

// Extended type to include Category if available
export type FishCardWithCategory = FishCard & {
    category?: Category | null;
    attributeTags?: string;
    description?: string;
    scientificName?: string;
};

interface PokemonCardProps {
    fish: Partial<FishCardWithCategory>;
    className?: string;
}

export function PokemonCard({ fish, className }: PokemonCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse position values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring physics for rotation
    const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

    // Glare effect values
    const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [100, 0]), springConfig);
    const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [100, 0]), springConfig);

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();

        // Normalize mouse position between -0.5 and 0.5 relative to the card's center
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

    // Parse attribute tags safely
    const tags = fish.attributeTags
        ? fish.attributeTags.split(",").map(t => t.trim()).filter(Boolean)
        : ["정보 없음"];

    // Determine Primary Color based on the first tag or category
    const primaryTag = tags[0] || fish.category?.name || "기본";

    let themeColors = {
        border: "from-slate-300 via-slate-100 to-slate-400",
        bg: "bg-slate-50",
        badge: "bg-slate-200 text-slate-800",
        accent: "text-slate-700"
    };

    if (primaryTag.includes("해수") || primaryTag.includes("바다")) {
        themeColors = {
            border: "from-blue-500 via-cyan-300 to-blue-700",
            bg: "bg-blue-50",
            badge: "bg-blue-200 text-blue-900",
            accent: "text-blue-800"
        };
    } else if (primaryTag.includes("담수") || primaryTag.includes("강")) {
        themeColors = {
            border: "from-emerald-400 via-green-200 to-teal-500",
            bg: "bg-emerald-50",
            badge: "bg-emerald-200 text-emerald-900",
            accent: "text-emerald-800"
        };
    } else if (primaryTag.includes("양서") || primaryTag.includes("개구리")) {
        themeColors = {
            border: "from-purple-500 via-fuchsia-300 to-pink-500",
            bg: "bg-purple-50",
            badge: "bg-purple-200 text-purple-900",
            accent: "text-purple-800"
        };
    }

    return (
        <div className={cn("perspective-1000 flex items-center justify-center p-4 h-full", className)}>
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className={cn(
                    "relative w-full max-w-[360px] rounded-2xl p-[5px] shadow-xl overflow-hidden cursor-pointer",
                    "bg-gradient-to-br", themeColors.border
                )}
            >
                {/* Inner Card Area */}
                <div className={cn("relative w-full h-full rounded-xl flex flex-col p-2.5 overflow-hidden", themeColors.bg)}>

                    {/* Header: Name and HP/Difficulty */}
                    <div className="flex justify-between items-start mb-1.5 z-10">
                        <h2 className={cn("text-lg font-black tracking-tight leading-tight", themeColors.accent)}>
                            {fish.name || "이름 모를 물고기"}
                        </h2>
                        <div className="flex items-center bg-white/60 px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-sm shrink-0">
                            <span className="text-[10px] font-bold text-gray-500 mr-0.5">LV.</span>
                            <StarRating rating={fish.difficultyLevel || 1} maxRating={5} />
                        </div>
                    </div>

                    {/* Image Frame */}
                    <div
                        className="w-full h-36 sm:h-40 bg-zinc-200 rounded-lg overflow-hidden border-[3px] border-white/50 shadow-inner relative z-10 mb-2"
                        style={{ transform: "translateZ(30px)" }} // Pop out the image
                    >
                        {fish.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={fish.imageUrl}
                                alt={fish.name || "Fish"}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm font-medium">이미지 준비중</span>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-2 z-10">
                        {tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", themeColors.badge)}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Information Body - 컴팩트 버전 */}
                    <div
                        className="bg-white/70 rounded-lg p-2 text-sm shadow-sm border border-black/5 z-10"
                        style={{ transform: "translateZ(20px)" }}
                    >
                        {fish.description && (
                            <p className="font-medium text-gray-800 italic text-xs leading-relaxed line-clamp-2 mb-1">{fish.description}</p>
                        )}
                        <div className="h-px bg-black/10 w-full my-1"></div>
                        <p className="text-gray-600 text-xs leading-relaxed line-clamp-3">
                            {fish.detailCare || fish.detailAppearance || fish.detailCompanionship || "상세 정보는 카드를 클릭하세요."}
                        </p>
                    </div>

                    {/* Footer: Scientific Name */}
                    <div className="mt-1.5 text-center z-10">
                        <p className="text-[10px] text-gray-500 font-mono tracking-wider italic">
                            {fish.scientificName || "Scientific Name Unknown"}
                        </p>
                    </div>
                </div>

                {/* Glare Effect Overlay */}
                {isHovered && (
                    <motion.div
                        className="pointer-events-none absolute inset-0 z-20 rounded-xl mix-blend-overlay"
                        style={{
                            background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`,
                        }}
                    />
                )}
            </motion.div>
        </div>
    );
}
