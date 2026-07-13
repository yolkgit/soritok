"use client";

import { useSession } from "next-auth/react";
import { Fish } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AddOwnsButtonProps {
    fishId: number;
}

// 물고기 아이콘 버튼: "키우는 중" (OWNS) 토글
export default function AddOwnsButton({ fishId }: AddOwnsButtonProps) {
    const { data: session } = useSession();
    const [isActive, setIsActive] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 로그인 상태일 때 현재 보유 여부 확인
    useEffect(() => {
        if (!session) return;
        fetch("/aqua/api/collections")
            .then(res => res.json())
            .then(data => {
                const found = data.owns?.some(
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
                body: JSON.stringify({ fishCardId: fishId, type: "OWNS" }),
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
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500 hover:bg-teal-500 hover:text-white"
                    : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-teal-400 hover:border-teal-400 hover:bg-slate-800/80"
                }`}
            aria-label={isActive ? "내 어항에서 빼기" : "내 어항에 담기"}
            title={isActive ? "내 어항에서 빼기" : "내 어항에 담기"}
        >
            <Fish className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
        </motion.button>
    );
}
