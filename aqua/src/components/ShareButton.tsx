"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareButtonProps {
    title: string;
    text: string;
}

export default function ShareButton({ title, text }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const shareData = {
            title,
            text,
            url: window.location.href,
        };

        try {
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className={`flex items-center justify-center p-3 rounded-full transition-all duration-300 shadow-lg 
                    ${copied
                        ? "bg-green-500/20 text-green-400 border border-green-500 hover:bg-green-500 hover:text-white"
                        : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-indigo-400 hover:border-indigo-400 hover:bg-slate-800/80"
                    }`}
                aria-label="공유하기"
                title="공유하기"
            >
                {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
            </motion.button>

            <AnimatePresence>
                {copied && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 shadow-xl whitespace-nowrap z-50 pointer-events-none"
                    >
                        링크 복사 완료!
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-b border-r border-slate-700 transform rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
