"use client";

import { useState, useEffect } from "react";
import PostCard, { Post } from "@/components/community/PostCard";
import { PlusCircle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function CommunityFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { data: session } = useSession();

    const fetchPosts = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/aqua/api/posts?take=20");
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts);
            }
        } catch (error) {
            console.error("Failed to load posts", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDeletePost = (postId: string) => {
        setPosts(posts.filter((p) => p.id !== postId));
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-jamsil flex items-center gap-3 text-white">
                        <ImageIcon className="w-8 h-8 text-teal-400" />
                        내 물생활 자랑하기
                    </h1>
                    <p className="text-slate-400 mt-2">
                        소중한 반려물고기와 아름다운 어항을 마음껏 자랑해보세요!
                    </p>
                </div>

                {session ? (
                    <Link
                        href="/community/write"
                        className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium transition-colors shadow-lg shadow-teal-500/20"
                    >
                        <PlusCircle className="w-5 h-5" />
                        자랑하기
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors border border-slate-600"
                    >
                        로그인 후 자랑하기
                    </Link>
                )}
            </div>

            {/* Feed List */}
            <div className="space-y-8">
                {isLoading ? (
                    <div className="text-center py-20 text-slate-500">
                        게시글을 불러오는 중...
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                        <p className="text-slate-400 text-lg">아직 올라온 사진이 없습니다.</p>
                        <p className="text-slate-500 mt-2">첫 번째로 자랑글을 올려보세요!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onDelete={handleDeletePost}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
