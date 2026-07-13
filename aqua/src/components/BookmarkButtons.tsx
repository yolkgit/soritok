"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Fish, Sparkles } from "lucide-react";

interface BookmarkButtonsProps {
    fishCardId: number;
}

export default function BookmarkButtons({ fishCardId }: BookmarkButtonsProps) {
    const { data: session } = useSession();
    const [isOwns, setIsOwns] = useState(false);
    const [isWants, setIsWants] = useState(false);

    const handleToggle = async (type: "OWNS" | "WANTS") => {
        if (!session) {
            alert("로그인이 필요합니다.");
            return;
        }

        try {
            const res = await fetch("/aqua/api/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fishCardId, type }),
            });

            if (res.ok) {
                const data = await res.json();
                if (type === "OWNS") setIsOwns(data.added);
                else setIsWants(data.added);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleToggle("OWNS")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isOwns
                        ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                        : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                    }`}
                title="키우는 중"
            >
                <Fish className="w-4 h-4" />
                키우는 중
            </button>
            <button
                onClick={() => handleToggle("WANTS")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isWants
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                        : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                    }`}
                title="키우고 싶은"
            >
                <Sparkles className="w-4 h-4" />
                키우고 싶은
            </button>
        </div>
    );
}
