"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/aqua/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                // 회원가입 성공 시 로그인 페이지로
                router.push("/login?registered=true");
            } else {
                const data = await res.json();
                setError(data.error || "회원가입에 실패했습니다.");
            }
        } catch (err) {
            setError("서버 통신 중 문제가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center pt-10 pb-20 px-4 mt-6">
            <div className="w-full max-w-md bg-slate-900/80 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-md">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        회원가입
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm text-center">
                        지금 가입하고 의견을 남겨보세요.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            닉네임 (이름)
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-600"
                            placeholder="아쿠아마스터"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            이메일
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-600"
                            placeholder="hello@aquado.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            비밀번호
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-600"
                            placeholder="6자리 이상 입력"
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
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50 mt-2"
                    >
                        {loading ? "가입 중..." : "회원가입 완료"}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-400">
                    이미 계정이 있으신가요?{" "}
                    <Link href="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 underline-offset-4 hover:underline">
                        로그인하기
                    </Link>
                </div>
            </div>
        </div>
    );
}
