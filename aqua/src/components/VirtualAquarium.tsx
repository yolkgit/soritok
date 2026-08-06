"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface TankFish {
    id: number;
    name: string;
    imageUrl: string;
}

interface DecorItem {
    id: string;
    kind: string; // DECOR_SET 의 key
    x: number; // 0~100 (%)
    y: number; // 0~100 (%)
}

// 배치 가능한 악세사리 (이모지 기반 — 에셋 불필요)
const DECOR_SET: { key: string; emoji: string; label: string; floor: boolean }[] = [
    { key: "plant", emoji: "🌿", label: "수초", floor: true },
    { key: "coral", emoji: "🪸", label: "산호", floor: true },
    { key: "rock", emoji: "🪨", label: "바위", floor: true },
    { key: "wood", emoji: "🪵", label: "유목", floor: true },
    { key: "castle", emoji: "🏰", label: "성", floor: true },
    { key: "shell", emoji: "🐚", label: "조개", floor: true },
    { key: "star", emoji: "⭐", label: "불가사리", floor: true },
    { key: "moai", emoji: "🗿", label: "석상", floor: true },
    { key: "bubbler", emoji: "🫧", label: "기포기", floor: true },
    { key: "diver", emoji: "🤿", label: "다이버", floor: false },
];

const DECOR_STORAGE_KEY = "aquarium-decor";

// 물고기 id 기반의 고정 난수 (렌더마다 흔들리지 않게)
function seeded(id: number, salt: number) {
    const x = Math.sin(id * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export default function VirtualAquarium({ fish }: { fish: TankFish[] }) {
    const [decor, setDecor] = useState<DecorItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const tankRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

    // 악세사리 localStorage 로드/저장 (내 어항 목록과 동일한 로컬 저장 방식)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DECOR_STORAGE_KEY);
            if (raw) setDecor(JSON.parse(raw));
        } catch {
            /* 무시 */
        }
        setLoaded(true);
    }, []);
    useEffect(() => {
        if (loaded) localStorage.setItem(DECOR_STORAGE_KEY, JSON.stringify(decor));
    }, [decor, loaded]);

    // 물고기별 유영 파라미터 (id 시드 고정)
    const swimmers = useMemo(
        () =>
            fish.map((f, i) => {
                const depth = 12 + seeded(f.id, 1) * 55; // 상단 12~67%
                const dur = 22 + seeded(f.id, 2) * 26; // 22~48초 왕복
                const delay = -seeded(f.id, 3) * dur; // 시작 위치 분산
                const bobDur = 3.2 + seeded(f.id, 4) * 2.8;
                const size = 84 + seeded(f.id, 5) * 44; // 84~128px
                const dim = 0.75 + (1 - depth / 70) * 0.25; // 깊을수록 어둡게
                return { ...f, depth, dur, delay, bobDur, size, dim, z: Math.round(depth) };
            }),
        [fish],
    );

    const addDecor = (kind: string) => {
        const def = DECOR_SET.find((d) => d.key === kind)!;
        const x = 8 + Math.random() * 84;
        const y = def.floor ? 82 + Math.random() * 8 : 20 + Math.random() * 45;
        setDecor((prev) => [...prev, { id: `${kind}-${Date.now()}`, kind, x, y }]);
    };

    // 드래그 이동 (포인터 이벤트)
    const onPointerDown = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        dragRef.current = { id, moved: false };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        const tank = tankRef.current;
        if (!drag || !tank) return;
        drag.moved = true;
        const rect = tank.getBoundingClientRect();
        const x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.min(94, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100));
        setDecor((prev) => prev.map((d) => (d.id === drag.id ? { ...d, x, y } : d)));
    };
    const onPointerUp = () => {
        dragRef.current = null;
    };

    return (
        <div className="mb-14">
            {/* ─── 수조 ─── */}
            <div
                ref={tankRef}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="relative w-full h-[420px] sm:h-[500px] rounded-3xl overflow-hidden border-4 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_0_60px_rgba(0,40,80,0.5)] select-none"
                style={{
                    background:
                        "linear-gradient(180deg, #0e3a5c 0%, #0b2f4e 30%, #082540 60%, #06121f 100%)",
                }}
            >
                {/* 빛줄기 */}
                <div className="aq-ray" style={{ left: "12%", animationDelay: "0s" }} />
                <div className="aq-ray" style={{ left: "45%", animationDelay: "2.4s" }} />
                <div className="aq-ray" style={{ left: "74%", animationDelay: "1.1s" }} />

                {/* 은은한 배경 기포 */}
                {[8, 26, 58, 87].map((x, i) => (
                    <span key={i} className="aq-bubble" style={{ left: `${x}%`, animationDelay: `${i * 1.7}s` }} />
                ))}

                {/* 모래 바닥 */}
                <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[#c9b280] via-[#a8905f]/70 to-transparent" />

                {/* 악세사리 */}
                {decor.map((d) => {
                    const def = DECOR_SET.find((s) => s.key === d.kind);
                    if (!def) return null;
                    return (
                        <div
                            key={d.id}
                            className="absolute group/decor cursor-grab active:cursor-grabbing touch-none"
                            style={{ left: `${d.x}%`, top: `${d.y}%`, transform: "translate(-50%, -50%)", zIndex: Math.round(d.y) }}
                            onPointerDown={(e) => onPointerDown(e, d.id)}
                        >
                            <span className="text-4xl sm:text-5xl drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] block aq-sway">
                                {def.emoji}
                            </span>
                            {d.kind === "bubbler" &&
                                [0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="aq-bubble !w-2 !h-2"
                                        style={{ left: `${30 + i * 15}%`, bottom: "60%", animationDelay: `${i * 0.9}s`, animationDuration: "4.5s" }}
                                    />
                                ))}
                            <button
                                onClick={() => setDecor((prev) => prev.filter((x) => x.id !== d.id))}
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center opacity-0 group-hover/decor:opacity-100 transition-opacity"
                                aria-label={`${def.label} 제거`}
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}

                {/* 물고기 */}
                {swimmers.map((f) => (
                    <div
                        key={f.id}
                        className="absolute pointer-events-none"
                        style={{
                            top: `${f.depth}%`,
                            zIndex: f.z + 10,
                            animation: `aq-swim-x ${f.dur}s linear ${f.delay}s infinite`,
                        }}
                    >
                        <div style={{ animation: `aq-flip ${f.dur}s step-end ${f.delay}s infinite` }}>
                            <div style={{ animation: `aq-bob ${f.bobDur}s ease-in-out infinite alternate` }}>
                                <Link
                                    href={`/fish/${f.id}`}
                                    className="block pointer-events-auto group/fish"
                                    title={f.name}
                                >
                                    <div
                                        className="relative overflow-hidden border-2 border-white/25 shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-transform group-hover/fish:scale-110"
                                        style={{
                                            width: f.size,
                                            height: f.size * 0.62,
                                            borderRadius: "50% 46% 48% 52% / 55% 52% 48% 45%",
                                            filter: `brightness(${f.dim})`,
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                                        <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-cyan-300/10 to-transparent" />
                                    </div>
                                    <span className="absolute left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 text-[11px] text-cyan-100 whitespace-nowrap opacity-0 group-hover/fish:opacity-100 transition-opacity">
                                        {f.name}
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}

                {/* 비어있을 때 */}
                {fish.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300/70 text-lg">
                        도감에서 어종을 추가하면 여기서 헤엄쳐요 🐟
                    </div>
                )}

                {/* 유리 반사 */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />
            </div>

            {/* ─── 악세사리 팔레트 ─── */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-slate-400 mr-1">🛋️ 어항 꾸미기:</span>
                {DECOR_SET.map((d) => (
                    <button
                        key={d.key}
                        onClick={() => addDecor(d.key)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-teal-500 hover:bg-slate-800 transition-colors text-lg"
                        title={`${d.label} 추가`}
                    >
                        {d.emoji}
                    </button>
                ))}
                <span className="text-xs text-slate-500 ml-2">클릭해서 추가 · 드래그로 이동 · ✕로 제거</span>
            </div>

            {/* 애니메이션 정의 */}
            <style>{`
                @keyframes aq-swim-x {
                    0% { left: -18%; }
                    50% { left: 100%; }
                    100% { left: -18%; }
                }
                @keyframes aq-flip {
                    0%, 49.99% { transform: scaleX(1); }
                    50%, 100% { transform: scaleX(-1); }
                }
                @keyframes aq-bob {
                    0% { transform: translateY(-7px) rotate(-2.5deg); }
                    100% { transform: translateY(7px) rotate(2.5deg); }
                }
                .aq-ray {
                    position: absolute;
                    top: -10%;
                    width: 90px;
                    height: 75%;
                    background: linear-gradient(180deg, rgba(160,220,255,0.16), transparent 85%);
                    transform: skewX(-12deg);
                    animation: aq-ray-sway 9s ease-in-out infinite alternate;
                    pointer-events: none;
                }
                @keyframes aq-ray-sway {
                    0% { transform: skewX(-14deg) translateX(-14px); opacity: 0.55; }
                    100% { transform: skewX(-7deg) translateX(14px); opacity: 1; }
                }
                .aq-bubble {
                    position: absolute;
                    bottom: 8px;
                    width: 9px;
                    height: 9px;
                    border-radius: 9999px;
                    border: 1px solid rgba(190,235,255,0.5);
                    background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), rgba(190,235,255,0.08));
                    animation: aq-rise 7s linear infinite;
                    pointer-events: none;
                }
                @keyframes aq-rise {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 0.9; }
                    100% { transform: translateY(-460px) translateX(14px); opacity: 0; }
                }
                .aq-sway {
                    animation: aq-decor-sway 5s ease-in-out infinite alternate;
                    transform-origin: bottom center;
                }
                @keyframes aq-decor-sway {
                    0% { transform: rotate(-3deg); }
                    100% { transform: rotate(3deg); }
                }
            `}</style>
        </div>
    );
}
