"use client";

import { useState, useEffect } from "react";
import { Sparkles, Save, Loader2, Fish, Pencil, Trash2, Plus } from "lucide-react";
import FishCardItem from "@/components/FishCardItem";
import FishCardEditor from "./components/FishCardEditor";

export default function AdminPage() {
    const [category, setCategory] = useState("amphibians");
    const [fishName, setFishName] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    // List View State
    const [cards, setCards] = useState<any[]>([]);
    const [editingFish, setEditingFish] = useState<any | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Search and Pagination State
    const [adminSearchQuery, setAdminSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            // Add a cache-busting timestamp to bypass Next.js client-side fetch wrapper caching
            const res = await fetch(`/aqua/api/fish?t=${Date.now()}`, { cache: "no-store" });
            const data = await res.json();
            if (data.cards) setCards(data.cards);
        } catch (error) {
            console.error("Failed to load cards", error);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fishName) return;

        setLoading(true);
        try {
            const response = await fetch("/aqua/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, name: fishName }),
            });
            const data = await response.json();

            if (data.error) throw new Error(data.error);
            setPreviewData(data.result);
        } catch (error) {
            console.error(error);
            alert("생성 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!previewData) return;
        setSaving(true);
        try {
            const response = await fetch("/aqua/api/fish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(previewData),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            alert("성공적으로 저장되었습니다!");
            setPreviewData(null);
            setFishName("");
            fetchCards(); // Refresh list
        } catch (error) {
            console.error(error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`/aqua/api/fish/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("삭제 실패");
            fetchCards();
        } catch (error) {
            console.error(error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const openCreateModal = () => {
        setEditingFish(null);
        setIsEditorOpen(true);
    };

    const openEditModal = (fish: any) => {
        setEditingFish(fish);
        setIsEditorOpen(true);
    };

    // Filter cards based on search query
    const filteredAdminCards = cards.filter(card => {
        const query = adminSearchQuery.toLowerCase();
        return (
            card.name.toLowerCase().includes(query) ||
            (card.scientificName && card.scientificName.toLowerCase().includes(query)) ||
            (card.category?.name && card.category.name.toLowerCase().includes(query))
        );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredAdminCards.length / itemsPerPage) || 1;

    // Ensure current page is valid when filtering changes
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [filteredAdminCards.length, totalPages, currentPage]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCards = filteredAdminCards.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="max-w-6xl mx-auto space-y-16">
            <section>
                <header className="mb-8 border-b border-white/5 pb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                            <Sparkles className="w-8 h-8 text-blue-400" />
                            AI 기반 어종 카드 생성기
                        </h1>
                        <p className="text-slate-400 mt-2">
                            원하는 어종의 이름만 입력하면, Gemini API가 상세 정보를 자동으로 분석해 포켓몬 카드로 만들어줍니다.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Input Form */}
                    <section className="lg:col-span-4 space-y-6">
                        <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">카테고리</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="freshwater">담수어</option>
                                        <option value="saltwater">해수어</option>
                                        <option value="amphibians">양서류</option>
                                        <option value="invertebrates">무척추동물</option>
                                        <option value="plants">수초</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">어종 이름</label>
                                    <input
                                        type="text"
                                        placeholder="예: 네온테트라, 코리도라스"
                                        required
                                        value={fishName}
                                        onChange={(e) => setFishName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading || !fishName}
                                        className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-400 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                생성 중...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                AI 카드 만들기
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                            <p className="text-slate-400 mb-4 text-sm">정보를 수동으로 직접 등록하고 싶으신가요?</p>
                            <button onClick={openCreateModal} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700">
                                <Plus className="w-5 h-5 text-blue-400" /> 수동 데이터 등록
                            </button>
                        </div>
                    </section>

                    {/* Right: Live Preview */}
                    <section className="lg:col-span-8 flex flex-col items-center justify-center min-h-[400px] bg-slate-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                        {/* subtle background pattern */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                        {loading ? (
                            <div className="flex flex-col items-center text-slate-400 animate-pulse">
                                <Sparkles className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
                                <p className="text-lg font-medium">Gemini AI가 정보를 수집하고 있습니다...</p>
                                <p className="text-sm mt-2 opacity-60">생태 환경 및 이미지 데이터 처리 중</p>
                            </div>
                        ) : previewData ? (
                            <div className="w-full max-w-sm flex flex-col items-center relative z-10">
                                {/* Header info */}
                                <div className="w-full flex justify-between items-center mb-6">
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                                        미리보기 완료
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(previewData)}
                                            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors border border-slate-700"
                                        >
                                            <Pencil className="w-4 h-4" /> 편집
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold py-2 px-5 rounded-full flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {saving ? "저장 중" : "최종 저장"}
                                        </button>
                                    </div>
                                </div>

                                {/* Re-using our Client Component */}
                                <FishCardItem data={previewData} />
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 relative z-10">
                                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                    <Fish className="w-10 h-10 text-slate-600" />
                                </div>
                                <p>좌측 폼에 이름을 입력하고 생성 버튼을 누르면</p>
                                <p>이곳에 완성된 포켓몬 카드가 표시됩니다.</p>
                            </div>
                        )}
                    </section>
                </div>
            </section>

            {/* Registered Data List Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-white mb-1">
                            등록된 데이터 관리
                        </h2>
                        <p className="text-slate-400 text-sm">DB에 저장된 모든 어종 카드를 데이터베이스에서 직접 수정하고 삭제할 수 있습니다.</p>
                    </div>

                    {/* Admin Table Search */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Sparkles className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="이름, 학명, 분류 검색..."
                            className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            value={adminSearchQuery}
                            onChange={(e) => {
                                setAdminSearchQuery(e.target.value);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-xs border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-4 rounded-tl-xl">ID</th>
                                <th className="px-4 py-4">이미지</th>
                                <th className="px-4 py-4">어종 이름</th>
                                <th className="px-4 py-4 hidden md:table-cell">학명</th>
                                <th className="px-4 py-4">분류</th>
                                <th className="px-4 py-4 hidden lg:table-cell">등록일</th>
                                <th className="px-4 py-4 rounded-tr-xl text-right">관리 액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 border-b border-slate-800">
                            {paginatedCards.map((card) => (
                                <tr key={card.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-500">#{card.id}</td>
                                    <td className="px-4 py-3">
                                        {card.imageUrl ? (
                                            <img src={card.imageUrl} alt={card.name} className="w-10 h-10 rounded-md object-cover border border-slate-700" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700">
                                                <Fish className="w-5 h-5 text-slate-600" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-white">{card.name}</td>
                                    <td className="px-4 py-3 hidden md:table-cell italic text-slate-400">{card.scientificName}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-xs font-medium">
                                            {card.category?.name || "분류 없음"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                                        {new Date(card.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button
                                            onClick={() => openEditModal(card)}
                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition border border-slate-700"
                                            title="수정"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(card.id)}
                                            className="p-2 bg-slate-800 hover:bg-red-900/50 text-red-400 rounded-lg transition border border-slate-700"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedCards.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        <Fish className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                        {adminSearchQuery ? "검색 결과가 없습니다." : "등록된 어종 데이터가 없습니다. 상단의 AI 생성기를 이용해보세요."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                        <p className="text-sm text-slate-400">
                            총 <span className="font-semibold text-slate-200">{filteredAdminCards.length}</span>개의 데이터 중 <span className="font-semibold text-slate-200">{startIndex + 1}</span>~<span className="font-semibold text-slate-200">{Math.min(startIndex + itemsPerPage, filteredAdminCards.length)}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 transition-colors"
                            >
                                이전
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${currentPage === page
                                            ? "bg-blue-600 text-white border border-blue-500"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 transition-colors"
                            >
                                다음
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {isEditorOpen && (
                <FishCardEditor
                    initialData={editingFish}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={() => {
                        setIsEditorOpen(false);
                        fetchCards();
                    }}
                />
            )}
        </div>
    );
}
