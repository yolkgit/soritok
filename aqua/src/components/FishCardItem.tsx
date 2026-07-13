"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MouseEvent } from "react";
import { Star, Droplets, AlertTriangle, ShieldCheck, Fish } from "lucide-react";
import Image from "next/image";

interface FishCardProps {
    data: {
        name: string;
        imageUrl: string;
        difficultyLevel: number;
        pokedexEntry: string;
        detailCare: string;
        detailDisease: string;
        detailBreeding: string;
        temp: string;
        ph: string;
    };
}

export default function FishCardItem({ data }: FishCardProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            className="group relative max-w-sm rounded-[2rem] border border-white/10 bg-slate-900 overflow-hidden shadow-2xl"
            onMouseMove={handleMouseMove}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -10, scale: 1.02 }}
        >
            {/* Hologram Gradient Hover Effect */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-300 group-hover:opacity-100 mix-blend-color-dodge z-30"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(147, 197, 253, 0.15),
              transparent 40%
            )
          `,
                }}
            />
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-300 group-hover:opacity-50 z-20"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.1),
              transparent 40%
            )
          `,
                }}
            />

            {/* Image Header region */}
            <div className="relative h-64 w-full overflow-hidden bg-slate-800">
                <Image
                    src={data.imageUrl || "/aqua/images/default-fish.png"}
                    alt={data.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                />
                {/* Inner shadow overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />

                {/* Title overlay positioned in the image area */}
                <div className="absolute bottom-4 left-4 z-20">
                    <h2 className="text-2xl font-black tracking-tight text-white mb-1 drop-shadow-md">
                        {data.name}
                    </h2>
                    <div className="flex bg-slate-900/60 backdrop-blur-md rounded-full px-3 py-1 items-center space-x-1 w-fit border border-white/10">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest mr-1">난이도</span>
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`w-3 h-3 ${i < data.difficultyLevel ? "text-yellow-400 fill-yellow-400" : "text-slate-600"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Content wrapper */}
            <div className="p-6 space-y-5 text-sm">
                {/* Features */}
                <div>
                    <h3 className="flex items-center text-blue-400 font-bold mb-2">
                        <Droplets className="w-4 h-4 mr-2" />
                        도감 및 권장환경
                    </h3>
                    <p className="text-slate-400 leading-relaxed font-semibold italic">
                        {data.pokedexEntry || "도감 설명 정보 없음"}
                    </p>
                    <div className="flex gap-2 mt-3 text-xs">
                        <span className="bg-slate-800 px-2 py-1 rounded text-slate-300">수온: {data.temp || "정보 없음"}</span>
                        <span className="bg-slate-800 px-2 py-1 rounded text-slate-300">수질: {data.ph || "정보 없음"}</span>
                    </div>
                </div>

                {/* Care */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                    <h3 className="flex items-center text-blue-400 font-bold mb-2">
                        <Fish className="w-4 h-4 mr-2" />
                        사육 가이드
                    </h3>
                    <p className="text-blue-200/80 leading-relaxed line-clamp-3">
                        {data.detailCare || "가이드 정보 없음"}
                    </p>
                </div>

                {/* Cautions */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-4">
                    <div className="flex-1">
                        <h3 className="flex items-center text-red-400 font-bold mb-2">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            주의 스탯
                        </h3>
                        <p className="text-red-200/80 leading-relaxed line-clamp-2 text-xs">
                            {data.detailDisease || "질병 정보 없음"}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
