import { useState } from "react";
import { Heart, MessageCircle, MoreVertical, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface Author {
    id: string;
    name: string | null;
    image: string | null;
}

interface PostCount {
    comments: number;
    likes: number;
}

export interface Post {
    id: string;
    title: string;
    content: string;
    imageUrl: string | null;
    authorId: string;
    createdAt: string;
    author: Author;
    _count: PostCount;
}

interface PostCardProps {
    post: Post;
    onDelete?: (postId: string) => void;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
    const { data: session } = useSession();
    const [isLiked, setIsLiked] = useState(false); // To be synced with actual user state later
    const [likeCount, setLikeCount] = useState(post._count.likes);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLike = async () => {
        if (!session) {
            alert("로그인이 필요합니다.");
            return;
        }

        try {
            const res = await fetch(`/aqua/api/posts/${post.id}/like`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setIsLiked(data.liked);
                setLikeCount((prev) => (data.liked ? prev + 1 : prev - 1));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = () => {
        if (confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
            onDelete?.(post.id);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }).format(date);
    };

    const isOwnerOrAdmin =
        session?.user?.id === post.authorId || session?.user?.role === "ADMIN";

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0">
                        {post.author.image ? (
                            <img src={post.author.image} alt={post.author.name || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                {post.author.name?.[0] || "U"}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="font-semibold text-white">{post.author.name || "익명"}</div>
                        <div className="text-xs text-slate-400">{formatDate(post.createdAt)}</div>
                    </div>
                </div>

                {isOwnerOrAdmin && (
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-10">
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-slate-700 transition-colors text-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    삭제하기
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Content */}
            {post.imageUrl && (
                <div className="relative w-full aspect-square bg-slate-900">
                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Body Content */}
            <div className="p-4">
                <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
                <p className="text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-700/50">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition-colors ${isLiked ? "text-red-500" : "text-slate-400 hover:text-red-400"
                            }`}
                    >
                        <Heart className={`w-6 h-6 ${isLiked ? "fill-red-500" : ""}`} />
                        <span className="font-medium">{likeCount}</span>
                    </button>

                    <button className="flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors">
                        <MessageCircle className="w-6 h-6" />
                        <span className="font-medium">{post._count.comments}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
