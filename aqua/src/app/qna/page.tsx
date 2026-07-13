"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { HelpCircle, PlusCircle, CheckCircle2, MessageSquare, Tag } from "lucide-react";

interface QuestionAuthor {
    id: string;
    name: string | null;
    image: string | null;
}

interface Question {
    id: string;
    title: string;
    content: string;
    tag: string | null;
    isSolved: boolean;
    createdAt: string;
    author: QuestionAuthor;
    _count: { answers: number };
}

const TAG_LIST = ["사육환경", "질병/치료", "합사", "먹이", "번식", "장비", "기타"];

export default function QnAPage() {
    const { data: session } = useSession();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const fetchQuestions = async () => {
        try {
            setIsLoading(true);
            const tagParam = selectedTag ? `&tag=${selectedTag}` : "";
            const res = await fetch(`/aqua/api/questions?take=30${tagParam}`);
            if (res.ok) {
                const data = await res.json();
                setQuestions(data.questions);
            }
        } catch (error) {
            console.error("Q&A 목록 로드 실패:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [selectedTag]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
        }).format(date);
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-jamsil flex items-center gap-3 text-white">
                        <HelpCircle className="w-8 h-8 text-amber-400" />
                        Q&A 게시판
                    </h1>
                    <p className="text-slate-400 mt-2">
                        물생활 관련 궁금한 점을 질문하고 답변을 받아보세요!
                    </p>
                </div>
                {session ? (
                    <Link
                        href="/qna/ask"
                        className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-medium transition-colors shadow-lg shadow-amber-500/20"
                    >
                        <PlusCircle className="w-5 h-5" />
                        질문하기
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors border border-slate-600"
                    >
                        로그인 후 질문하기
                    </Link>
                )}
            </div>

            {/* 태그 필터 */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedTag
                            ? "bg-amber-500 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        }`}
                >
                    전체
                </button>
                {TAG_LIST.map((tag) => (
                    <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedTag === tag
                                ? "bg-amber-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                            }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {/* 질문 목록 */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-20 text-slate-500">질문을 불러오는 중...</div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                        <p className="text-slate-400 text-lg">아직 등록된 질문이 없습니다.</p>
                        <p className="text-slate-500 mt-2">첫 번째 질문을 올려보세요!</p>
                    </div>
                ) : (
                    questions.map((q) => (
                        <Link
                            key={q.id}
                            href={`/qna/${q.id}`}
                            className="block bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-slate-500 transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                {/* 해결 상태 아이콘 */}
                                <div className={`mt-1 shrink-0 ${q.isSolved ? "text-emerald-400" : "text-slate-600"}`}>
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {q.tag && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium">
                                                <Tag className="w-3 h-3" />
                                                {q.tag}
                                            </span>
                                        )}
                                        {q.isSolved && (
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
                                                해결됨
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                                        {q.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm line-clamp-1 mt-1">
                                        {q.content}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                        <span>{q.author.name || "익명"}</span>
                                        <span>{formatDate(q.createdAt)}</span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-4 h-4" />
                                            {q._count.answers}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
