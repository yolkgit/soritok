"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Send, Trash2, ArrowLeft, Tag, User as UserIcon } from "lucide-react";

interface Author {
    id: string;
    name: string | null;
    image: string | null;
}

interface Answer {
    id: string;
    content: string;
    isAccepted: boolean;
    createdAt: string;
    author: Author;
    authorId: string;
}

interface QuestionDetail {
    id: string;
    title: string;
    content: string;
    tag: string | null;
    isSolved: boolean;
    createdAt: string;
    author: Author;
    authorId: string;
    answers: Answer[];
    _count: { answers: number };
}

export default function QuestionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [question, setQuestion] = useState<QuestionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [answerContent, setAnswerContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchQuestion();
    }, [params.id]);

    const fetchQuestion = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/aqua/api/questions/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setQuestion(data);
            } else {
                router.push("/qna");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answerContent.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const res = await fetch(`/aqua/api/questions/${params.id}/answers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: answerContent }),
            });

            if (res.ok) {
                setAnswerContent("");
                fetchQuestion();
            } else {
                const data = await res.json();
                alert(data.error || "답변 등록에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQuestion = async () => {
        if (!confirm("정말로 이 질문을 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(`/aqua/api/questions/${params.id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/qna");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateString));
    };

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto py-20 text-center text-slate-500">
                질문을 불러오는 중...
            </div>
        );
    }

    if (!question) return null;

    const isOwnerOrAdmin =
        session?.user?.id === question.authorId || session?.user?.role === "ADMIN";

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* 뒤로 가기 */}
            <button
                onClick={() => router.push("/qna")}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                Q&A 목록으로
            </button>

            {/* 질문 본문 */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-8">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {question.tag && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium">
                                <Tag className="w-3 h-3" /> {question.tag}
                            </span>
                        )}
                        {question.isSolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" /> 해결됨
                            </span>
                        )}
                    </div>
                    {isOwnerOrAdmin && (
                        <button
                            onClick={handleDeleteQuestion}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                            title="질문 삭제"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <h1 className="text-2xl font-bold text-white mb-4">{question.title}</h1>
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {question.content}
                </p>

                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-700/50 text-sm text-slate-500">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                        {question.author.image ? (
                            <img src={question.author.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                    <span className="text-slate-300 font-medium">{question.author.name || "익명"}</span>
                    <span>·</span>
                    <span>{formatDate(question.createdAt)}</span>
                </div>
            </div>

            {/* 답변 목록 */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">
                    답변 <span className="text-amber-400">{question.answers.length}</span>개
                </h2>

                {question.answers.length === 0 ? (
                    <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
                        <p className="text-slate-400">아직 답변이 없습니다.</p>
                        <p className="text-slate-500 text-sm mt-1">첫 번째 답변을 남겨보세요!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {question.answers.map((answer) => (
                            <div
                                key={answer.id}
                                className={`bg-slate-800/30 rounded-xl p-5 border ${answer.isAccepted
                                        ? "border-emerald-500/50 bg-emerald-500/5"
                                        : "border-slate-700/50"
                                    }`}
                            >
                                {answer.isAccepted && (
                                    <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium mb-3">
                                        <CheckCircle2 className="w-4 h-4" />
                                        채택된 답변
                                    </div>
                                )}
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {answer.content}
                                </p>
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700/30 text-sm text-slate-500">
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                                        {answer.author.image ? (
                                            <img src={answer.author.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-3 h-3 text-slate-400" />
                                        )}
                                    </div>
                                    <span className="text-slate-300">{answer.author.name || "익명"}</span>
                                    <span>·</span>
                                    <span>{formatDate(answer.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 답변 작성 폼 */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
                {session ? (
                    <form onSubmit={handleSubmitAnswer} className="space-y-4">
                        <h3 className="text-lg font-bold text-white">답변 작성</h3>
                        <textarea
                            value={answerContent}
                            onChange={(e) => setAnswerContent(e.target.value)}
                            placeholder="도움이 되는 답변을 남겨주세요..."
                            className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500 outline-none min-h-[120px] resize-y"
                            maxLength={3000}
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting || !answerContent.trim()}
                                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-all"
                            >
                                {isSubmitting ? "등록 중..." : "답변 등록"}
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-slate-400 mb-4">로그인 후 답변을 작성할 수 있습니다.</p>
                        <a
                            href="/login"
                            className="inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg transition-colors font-medium"
                        >
                            로그인하기
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
