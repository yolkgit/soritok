"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fish } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError(res.error);
            } else {
                router.push("/");
                router.refresh(); // 세션 상태 반영을 위해 새로고침
            }
        } catch (err) {
            setError("로그인 중 문제가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center pt-10 pb-20 px-4 mt-6">
            <div className="w-full max-w-md bg-slate-900/80 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-md">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <Fish className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                        로그인
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm text-center">
                        Aquado 커뮤니티에서 물생활 노하우를 공유해보세요!
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            이메일
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder-slate-600"
                            placeholder="hello@aquado.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            비밀번호
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder-slate-600"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-all disabled:opacity-50"
                    >
                        {loading ? "로그인 중..." : "아쿠아도 시작하기"}
                    </button>
                </form>

                            </div>
        </div>
    );
}
