"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Power } from "lucide-react";

interface AdBanner {
    id: number;
    title: string;
    script: string;
    isActive: boolean;
    position: string;
    createdAt: string;
}

export default function AdminAdsPage() {
    const [ads, setAds] = useState<AdBanner[]>([]);
    const [loading, setLoading] = useState(true);

    // New Ad Form State
    const [title, setTitle] = useState("");
    const [position, setPosition] = useState("bottom");
    const [script, setScript] = useState("");

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        try {
            const res = await fetch("/aqua/api/ads");
            const data = await res.json();
            setAds(data.banners || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !script) return;

        try {
            const res = await fetch("/aqua/api/ads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, script, position, isActive: true }),
            });
            if (res.ok) {
                setTitle("");
                setScript("");
                fetchAds();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleActive = async (id: number, currentStatus: boolean) => {
        try {
            const res = await fetch(`/aqua/api/ads/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (res.ok) fetchAds();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`/aqua/api/ads/${id}`, { method: "DELETE" });
            if (res.ok) fetchAds();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            <header className="border-b border-white/5 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">프리미엄 광고 설정</h1>
                <p className="text-slate-400">물생활 취미 정보 센터의 수익화를 위한 배너 광고 스크립트를 관리합니다.</p>
            </header>

            {/* Create New Ad */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Plus className="text-blue-400 w-5 h-5" />
                    새 광고 단위 추가
                </h2>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">광고 식별용 제목</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 쿠팡 메인 하단 배너"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">노출 위치</label>
                        <select
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="top">상단 (Hero 아래)</option>
                            <option value="bottom">하단 (도감 리스트 아래)</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">HTML 스크립트 코드</label>
                        <textarea
                            required
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="<script src='https://ads.coupang.com/... '></script>"
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                        />
                    </div>
                    <div className="md:col-span-2 flex justify-end mt-2">
                        <button type="submit" className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                            광고 배너 추가
                        </button>
                    </div>
                </form>
            </section>

            {/* Ad List */}
            <section>
                <h2 className="text-xl font-bold mb-4">운영 중인 광고 목록</h2>
                {loading ? (
                    <div className="text-slate-500 py-10 text-center">불러오는 중...</div>
                ) : ads.length === 0 ? (
                    <div className="text-slate-500 py-10 text-center bg-slate-900 rounded-2xl border border-slate-800">
                        등록된 광고 배너가 없습니다.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {ads.map((ad) => (
                            <div key={ad.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg text-white">{ad.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ad.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                            {ad.isActive ? '노출 중' : '중지됨'}
                                        </span>
                                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {ad.position}
                                        </span>
                                    </div>
                                    <code className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded block truncate max-w-xl border border-slate-800 mt-2">
                                        {ad.script}
                                    </code>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleActive(ad.id, ad.isActive)}
                                        className={`p-2.5 rounded-xl transition-colors ${ad.isActive ? 'bg-slate-800 hover:bg-slate-700 text-yellow-500' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'}`}
                                        title={ad.isActive ? "광고 중지" : "광고 활성화"}
                                    >
                                        <Power className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ad.id)}
                                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
