"use client";

import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AddAquariumButtonProps {
    fishId: number;
}

// 하트 버튼: "키우고 싶은" (WANTS) 토글
export default function AddAquariumButton({ fishId }: AddAquariumButtonProps) {
    const { data: session } = useSession();
    const [isActive, setIsActive] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 로그인 상태일 때 현재 찜 여부 확인
    useEffect(() => {
        if (!session) return;
        fetch("/aqua/api/collections")
            .then(res => res.json())
            .then(data => {
                const found = data.wants?.some(
                    (item: { fishCard: { id: number } }) => item.fishCard.id === fishId
                );
                setIsActive(!!found);
            })
            .catch(() => { });
    }, [session, fishId]);

    if (!mounted) {
        return <div className="w-12 h-12 rounded-full border border-slate-700/50 bg-slate-800/50 animate-pulse" />;
    }

    const handleToggle = async () => {
        if (!session) {
            alert("로그인이 필요합니다.");
            return;
        }
        try {
            const res = await fetch("/aqua/api/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fishCardId: fishId, type: "WANTS" }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsActive(data.added);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggle}
            className={`flex items-center justify-center p-3 rounded-full transition-all duration-300 shadow-lg 
                ${isActive
                    ? "bg-pink-500/20 text-pink-500 border border-pink-500 hover:bg-pink-500 hover:text-white"
                    : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-pink-400 hover:border-pink-400 hover:bg-slate-800/80"
                }`}
            aria-label={isActive ? "찜 취소" : "키우고 싶은"}
            title={isActive ? "찜 취소" : "키우고 싶은"}
        >
            <Heart className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
        </motion.button>
    );
}
