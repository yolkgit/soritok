"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Send, Tag } from "lucide-react";

const TAG_LIST = ["사육환경", "질병/치료", "합사", "먹이", "번식", "장비", "기타"];

export default function AskQuestionPage() {
    const router = useRouter();
    const { status } = useSession();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tag, setTag] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch("/aqua/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, tag: tag || null }),
            });

            if (res.ok) {
                router.push("/qna");
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "질문 등록에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold font-jamsil mb-8 text-white">질문하기</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 태그 선택 */}
                <div>
                    <label className="block text-slate-400 font-medium mb-2 flex items-center gap-1">
                        <Tag className="w-4 h-4" /> 카테고리 (선택)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TAG_LIST.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTag(tag === t ? "" : t)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tag === t
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 제목 */}
                <div>
                    <label className="block text-slate-400 font-medium mb-2">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 네온테트라가 자꾸 색이 빠져요. 원인이 뭘까요?"
                        className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500 outline-none"
                        maxLength={200}
                        required
                    />
                </div>

                {/* 내용 */}
                <div>
                    <label className="block text-slate-400 font-medium mb-2">내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="수조 크기, 수온, pH, 합사 어종 등 가능한 한 상세하게 적어주시면 더 정확한 답변을 받을 수 있습니다."
                        className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500 outline-none min-h-[200px] resize-y"
                        maxLength={5000}
                        required
                    />
                </div>

                {/* 버튼 */}
                <div className="flex items-center gap-4 pt-6 border-t border-slate-700/50">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 py-4 text-slate-300 font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim() || !content.trim()}
                        className="flex-1 py-4 flex items-center justify-center gap-2 text-white font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                    >
                        {isSubmitting ? "등록 중..." : "질문 등록"}
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
