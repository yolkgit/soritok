"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Trash2, Send, User as UserIcon, ImagePlus, X, Heart } from "lucide-react";

interface CommentAuthor {
    id: string;
    name: string | null;
    image: string | null;
}

interface Comment {
    id: number;
    content: string;
    imageUrl?: string | null;
    upvotes: number;
    isUpvoted: boolean;
    createdAt: string;
    author: CommentAuthor;
    authorId: string;
}

interface CommentSectionProps {
    fishCardId: number;
}

export default function CommentSection({ fishCardId }: CommentSectionProps) {
    const { data: session } = useSession();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [fishCardId]);

    const fetchComments = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/aqua/api/fishcards/${fishCardId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error("댓글을 불러오는데 실패했습니다.", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            let base64Image = null;
            if (imageFile) {
                // Convert file to base64 for simple upload
                base64Image = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(imageFile);
                });
            }

            const res = await fetch(`/aqua/api/fishcards/${fishCardId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newComment,
                    imageUrl: base64Image
                }),
            });

            if (res.ok) {
                setNewComment("");
                handleRemoveImage();
                fetchComments(); // 새로고침
            } else {
                const error = await res.json();
                alert(error.error || "댓글 작성에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(`/aqua/api/comments/${commentId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setComments(comments.filter((c) => c.id !== commentId));
            } else {
                const error = await res.json();
                alert(error.error || "댓글 삭제에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("이미지 크기는 5MB 이하여야 합니다.");
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUpvote = async (commentId: number) => {
        if (!session) {
            alert("로그인이 필요합니다.");
            return;
        }

        try {
            // Optimistic update
            setComments(comments.map(c => {
                if (c.id === commentId) {
                    return {
                        ...c,
                        isUpvoted: !c.isUpvoted,
                        upvotes: c.isUpvoted ? c.upvotes - 1 : c.upvotes + 1
                    };
                }
                return c;
            }));

            const res = await fetch(`/aqua/api/comments/${commentId}/upvote`, {
                method: "POST",
            });

            if (!res.ok) {
                // Revert on failure
                fetchComments();
                const error = await res.json();
                console.error("Upvote failed:", error);
            }
        } catch (error) {
            console.error(error);
            fetchComments();
        }
    };

    return (
        <div className="mt-12 border-t border-slate-700 pt-8">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
                댓글 <span className="text-teal-400 text-lg">({comments.length})</span>
            </h3>

            {/* 댓글 입력 폼 */}
            <div className="mb-10 bg-slate-800/50 rounded-xl p-4 shadow-sm border border-slate-700">
                {session ? (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-900/50 flex items-center justify-center shrink-0 overflow-hidden border border-teal-800">
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-5 h-5 text-teal-400" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2 w-full">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="사육 경험이나 실물 사진을 공유해보세요..."
                                    className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 text-white placeholder-slate-500 outline-none resize-none min-h-[80px]"
                                    maxLength={500}
                                />

                                {imagePreview && (
                                    <div className="relative w-32 h-32 rounded-lg border border-slate-600 overflow-hidden group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-md transition-colors text-sm"
                                >
                                    <ImagePlus className="w-4 h-4" />
                                    <span>사진 첨부</span>
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || (!newComment.trim() && !imageFile)}
                                className="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
                            >
                                {isSubmitting ? "등록 중..." : "등록"} <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-slate-400 mb-4">로그인하고 다양한 물생활 정보를 나눠보세요!</p>
                        <a
                            href="/login"
                            className="inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg transition-colors font-medium"
                        >
                            로그인하기
                        </a>
                    </div>
                )}
            </div>

            {/* 댓글 목록 */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="text-center py-10 text-slate-500">댓글을 불러오는 중...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700">
                        <p className="text-slate-400">아직 등록된 댓글이 없습니다.</p>
                        <p className="text-slate-500 text-sm mt-1">첫 번째 댓글을 남겨보세요!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group bg-slate-800/20 p-4 rounded-xl border border-slate-700/50">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                {comment.author.image ? (
                                    <img src={comment.author.image} alt={comment.author.name || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-5 h-5 text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-white">
                                            {comment.author.name || "익명 사용자"}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                                    </div>

                                    {session?.user && (session.user.id === comment.authorId || session.user.role === "ADMIN") && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="댓글 삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">{comment.content}</p>

                                {comment.imageUrl && (
                                    <div className="mt-2 mb-3 rounded-xl overflow-hidden border border-slate-700 max-w-sm">
                                        <img src={comment.imageUrl} alt="Comment attachment" className="w-full h-auto object-cover max-h-60" loading="lazy" />
                                    </div>
                                )}

                                <div className="flex items-center gap-4 mt-2 border-t border-slate-700/50 pt-3">
                                    <button
                                        onClick={() => handleUpvote(comment.id)}
                                        className={`flex items-center gap-1.5 text-sm transition-colors ${comment.isUpvoted ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${comment.isUpvoted ? 'fill-pink-500' : ''}`} />
                                        <span className="font-medium">{comment.upvotes || 0}</span>
                                        {comment.isUpvoted && <span className="text-xs opacity-80">(추천됨)</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
