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

                <div className="mt-8 pt-6 border-t border-slate-800">
                    <button
                        onClick={() => signIn("google", { callbackUrl: "/aqua/" })}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-all font-medium text-slate-300"
                    >
                        {/* 구글 아이콘 SVG */}
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google 계정으로 로그인
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-slate-400">
                    아직 계정이 없으신가요?{" "}
                    <Link href="/register" className="text-teal-400 font-semibold hover:text-teal-300 underline-offset-4 hover:underline">
                        회원가입
                    </Link>
                </div>
            </div>
        </div>
    );
}
