"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Send } from "lucide-react";
import { useSession } from "next-auth/react";

export default function WritePostPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // redirect to login if not authenticated
    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const removeImage = () => {
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);
            let imageUrl = null;

            // 1. Upload File first
            if (file) {
                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await fetch("/aqua/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrl = uploadData.url;
                } else {
                    throw new Error("이미지 업로드에 실패했습니다.");
                }
            }

            // 2. Create Post
            const postRes = await fetch("/aqua/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    content,
                    imageUrl,
                }),
            });

            if (postRes.ok) {
                router.push("/community");
                router.refresh();
            } else {
                const errorData = await postRes.json();
                alert(errorData.error || "게시글 등록에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("진행 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold font-jamsil mb-8 text-white">
                자랑글 쓰기
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title Input */}
                <div>
                    <label className="block text-slate-400 font-medium mb-2">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 우리집 구피 어항 세팅 완료!"
                        className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-white placeholder-slate-500 outline-none transition-all"
                        maxLength={100}
                        required
                    />
                </div>

                {/* Content Input */}
                <div>
                    <label className="block text-slate-400 font-medium mb-2">내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="어떤 물고기와 함께하고 계신가요? 즐거운 물생활 이야기를 들려주세요."
                        className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-white placeholder-slate-500 outline-none min-h-[200px] resize-y transition-all"
                        maxLength={2000}
                        required
                    />
                </div>

                {/* Image Upload Area */}
                <div>
                    <label className="block text-slate-400 font-medium mb-2">
                        사진 첨부 (선택)
                    </label>

                    {!previewUrl ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-video bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-slate-800 transition-colors group"
                        >
                            <ImagePlus className="w-12 h-12 text-slate-500 group-hover:text-teal-400 mb-3 transition-colors" />
                            <p className="text-slate-400 font-medium group-hover:text-slate-300">
                                클릭하여 사진을 선택하세요
                            </p>
                            <p className="text-slate-500 text-sm mt-1">
                                권장 포맷: JPG, PNG, WEBP
                            </p>
                        </div>
                    ) : (
                        <div className="relative w-full aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-700 group">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                                title="사진 삭제"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                {/* Action Buttons */}
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
                        className="flex-1 py-4 flex items-center justify-center gap-2 text-white font-bold bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl shadow-lg shadow-teal-500/20 transition-all"
                    >
                        {isSubmitting ? "올리는 중..." : "글 등록하기"}
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
