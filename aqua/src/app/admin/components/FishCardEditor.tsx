"use client";

import { useState, useRef } from "react";
import { X, Upload, Save, Loader2 } from "lucide-react";

export default function FishCardEditor({
    initialData,
    onClose,
    onSave,
}: {
    initialData?: any;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        id: initialData?.id || null,
        categorySlug: initialData?.category?.slug || initialData?.categorySlug || "freshwater",
        baseSpecies: initialData?.baseSpecies || "",
        variantName: initialData?.variantName || "",
        grade: initialData?.grade || "기본",
        name: initialData?.name || "",
        scientificName: initialData?.scientificName || "",

        difficultyLevel: initialData?.difficultyLevel || 3,
        pokedexEntry: initialData?.pokedexEntry || "",

        temp: initialData?.temp || "24~26°C",
        ph: initialData?.ph || "pH 6.5~7.5",
        diet: initialData?.diet || "소형 사료",
        minTank: initialData?.minTank || "30큐브 이상",
        companionship: initialData?.companionship || "합사 가능",
        maxSize: initialData?.maxSize || "최대 5cm",

        detailHistory: initialData?.detailHistory || "",
        detailAppearance: initialData?.detailAppearance || "",
        detailCare: initialData?.detailCare || "",
        detailBreeding: initialData?.detailBreeding || "",
        detailDisease: initialData?.detailDisease || "",
        detailCompanionship: initialData?.detailCompanionship || "",

        imageUrl: initialData?.imageUrl || "",
        isPublished: initialData?.isPublished ?? true,
    });

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formUrlData = new FormData();
        formUrlData.append("file", file);

        try {
            const res = await fetch("/aqua/api/upload", {
                method: "POST",
                body: formUrlData,
            });
            const data = await res.json();
            if (data.url) {
                setFormData((prev) => ({ ...prev, imageUrl: data.url }));
            } else {
                alert(data.error || "업로드 실패");
            }
        } catch (err) {
            console.error(err);
            alert("이미지 업로드 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = formData.id ? `/aqua/api/fish/${formData.id}` : `/aqua/api/fish`;
            const method = formData.id ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "저장 실패");
            }
            onSave();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">어종 카드 {formData.id ? "수정" : "수동 등록"}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="fish-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">카테고리</label>
                                <select
                                    name="categorySlug"
                                    value={formData.categorySlug}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="freshwater">담수어</option>
                                    <option value="saltwater">해수어</option>
                                    <option value="amphibians">양서류</option>
                                    <option value="invertebrates">무척추동물</option>
                                    <option value="plants">수초</option>
                                </select>
                            </div>
                            <div className="flex items-end mb-1">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300">
                                    <input
                                        type="checkbox"
                                        name="isPublished"
                                        checked={formData.isPublished}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-500"
                                    />
                                    공개 여부 (웹사이트 표시)
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">어종 이름 (자동완성명) *</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">학명</label>
                                <input
                                    name="scientificName"
                                    value={formData.scientificName}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">원종 (비워둘 시 전체적용)</label>
                                <input
                                    name="baseSpecies"
                                    value={formData.baseSpecies}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600"
                                    placeholder="예: 구피, 베타"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">개량품종명</label>
                                <input
                                    name="variantName"
                                    value={formData.variantName}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600"
                                    placeholder="예: 알비노 풀레드"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">카드 등급 (야생은 '기본')</label>
                                <select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="기본">기본</option>
                                    <option value="고정">고정</option>
                                    <option value="희귀">희귀</option>
                                    <option value="브리딩">브리딩</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">최소 수조 사이즈</label>
                                <input
                                    name="minTank"
                                    value={formData.minTank}
                                    onChange={handleChange}
                                    placeholder="예: 30큐브 이상"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">사육 난이도 (1~5 정수)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    name="difficultyLevel"
                                    value={formData.difficultyLevel}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">수온 (temp)</label>
                                <input name="temp" value={formData.temp} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">수질 (pH)</label>
                                <input name="ph" value={formData.ph} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">먹이 (diet)</label>
                                <input name="diet" value={formData.diet} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">합사 난이도 (companionship)</label>
                                <input name="companionship" value={formData.companionship} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">최대 크기 (maxSize)</label>
                                <input name="maxSize" value={formData.maxSize} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">이미지 업로드/URL</label>
                            <div className="flex gap-3">
                                <input
                                    name="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={handleChange}
                                    placeholder="https://... 또는 직접 업로드"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    첨부
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                            </div>
                            {formData.imageUrl && (
                                <div className="mt-3">
                                    <img src={formData.imageUrl} alt="preview" className="h-24 w-auto rounded-lg border border-slate-700 object-cover" />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-emerald-400 mb-1 font-bold">도감 설명 (포켓몬 스타일 카드 표현)</label>
                            <textarea
                                name="pokedexEntry"
                                rows={2}
                                value={formData.pokedexEntry}
                                onChange={handleChange}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder="'강력한 턱으로 바닥을 청소하는 호수의 청소부!' 등 극적인 도감 설명"
                            />
                        </div>

                        {/* Wiki Detailed Fields */}
                        <div className="pt-4 border-t border-slate-800 space-y-6">
                            <h3 className="text-lg font-bold text-blue-400">위키백과 상세 해설 (전문가용)</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">발견 역사 및 개량 과정</label>
                                <textarea name="detailHistory" rows={3} value={formData.detailHistory} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">외형, 발색 및 해부학적 특징</label>
                                <textarea name="detailAppearance" rows={3} value={formData.detailAppearance} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">상세 사육/여과/환경 가이드</label>
                                <textarea name="detailCare" rows={3} value={formData.detailCare} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">산란 유도 및 번식 노하우</label>
                                <textarea name="detailBreeding" rows={3} value={formData.detailBreeding} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">주요 질병 및 전문 치료법</label>
                                <textarea name="detailDisease" rows={3} value={formData.detailDisease} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">합사 및 성향 가이드</label>
                                <textarea name="detailCompanionship" rows={3} value={formData.detailCompanionship} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                        취소
                    </button>
                    <button
                        form="fish-form"
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        저장하기
                    </button>
                </div>
            </div>
        </div>
    );
}
