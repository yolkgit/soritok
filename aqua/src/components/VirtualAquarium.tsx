"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface TankFish {
    id: number;
    name: string;
    /** 배경 제거(누끼) 이미지가 있으면 이것을 쓴다 */
    imageUrl: string;
    /** 누끼 여부 — 아니면 원본 사진을 부드러운 마스크로 띄운다 */
    isCutout: boolean;
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

// 한 수조에 동시에 헤엄치는 최대 마릿수 (과밀·성능 방지 — 나머지는 아래 목록에)
const TANK_CAPACITY = 14;

// 물고기 id 기반의 고정 난수 (렌더마다 흔들리지 않게)
function seeded(id: number, salt: number) {
    const x = Math.sin(id * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export default function VirtualAquarium({ fish }: { fish: TankFish[] }) {
    const router = useRouter();
    const [decor, setDecor] = useState<DecorItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const tankRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

    // 악세사리 localStorage 로드/저장
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

    const shown = useMemo(() => fish.slice(0, TANK_CAPACITY), [fish]);
    const overflow = fish.length - shown.length;

    // 개체별 유영 파라미터 — 레인을 나눠 겹침을 줄이고 크기·속도·깊이를 다양화
    const swimmers = useMemo(
        () =>
            shown.map((f, i) => {
                const lanes = Math.max(shown.length, 1);
                const laneTop = 6 + (i / lanes) * 62; // 6~68% 사이 레인
                const depth = laneTop + seeded(f.id, 1) * (62 / lanes) * 0.6;
                const scale = 0.7 + seeded(f.id, 5) * 0.55; // 원근감
                const dur = (26 + seeded(f.id, 2) * 22) / scale; // 큰 개체가 더 느긋하게
                const delay = -seeded(f.id, 3) * dur;
                const bobDur = 3.6 + seeded(f.id, 4) * 3.2;
                const width = Math.round(150 * scale);
                const dim = 0.72 + scale * 0.28; // 뒤쪽(작은) 개체는 어둡게
                const blur = scale < 0.85 ? (0.85 - scale) * 3 : 0; // 깊이감
                return { ...f, depth, dur, delay, bobDur, width, dim, blur, z: Math.round(scale * 100) };
            }),
        [shown],
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
        <div className="mb-10">
            {/* ─── 수조 ─── */}
            <div
                ref={tankRef}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="relative w-full h-[420px] sm:h-[520px] rounded-3xl overflow-hidden border-[6px] border-slate-800 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8),inset_0_0_80px_rgba(0,50,90,0.55)] select-none"
                style={{
                    background: "linear-gradient(180deg, #10496e 0%, #0c3557 28%, #082742 58%, #05131f 100%)",
                }}
            >
                {/* 빛줄기 */}
                <div className="aq-ray" style={{ left: "12%", animationDelay: "0s" }} />
                <div className="aq-ray" style={{ left: "45%", animationDelay: "2.4s" }} />
                <div className="aq-ray" style={{ left: "74%", animationDelay: "1.1s" }} />

                {/* 수면 일렁임 */}
                <div className="aq-caustics" />

                {/* 은은한 배경 기포 */}
                {[8, 26, 58, 87].map((x, i) => (
                    <span key={i} className="aq-bubble" style={{ left: `${x}%`, animationDelay: `${i * 1.7}s` }} />
                ))}

                {/* 모래 바닥 */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#d6bd8b] via-[#a8905f]/60 to-transparent" />

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

                {/* 물고기 — 배경을 제거한 이미지가 그대로 헤엄친다 */}
                {swimmers.map((f) => (
                    <div
                        key={f.id}
                        className="absolute"
                        style={{
                            top: `${f.depth}%`,
                            zIndex: f.z,
                            animation: `aq-swim-x ${f.dur}s linear ${f.delay}s infinite`,
                        }}
                    >
                        {/* 진행 방향에 맞춰 좌우 반전 */}
                        <div style={{ animation: `aq-flip ${f.dur}s step-end ${f.delay}s infinite` }}>
                            {/* 위아래로 일렁이기 */}
                            <div style={{ animation: `aq-bob ${f.bobDur}s ease-in-out infinite alternate` }}>
                                <button
                                    onClick={() => router.push(`/fish/${f.id}`)}
                                    className="relative block group/fish cursor-pointer bg-transparent border-0 p-0"
                                    title={f.name}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={f.imageUrl}
                                        alt={f.name}
                                        /* 어항 물고기는 화면 밖에서 출발하므로 lazy 로딩 금지 (빈칸 방지) */
                                        decoding="async"
                                        className="aq-fish-img transition-transform duration-200 group-hover/fish:scale-110"
                                        style={{
                                            width: f.width,
                                            height: "auto",
                                            filter: `brightness(${f.dim}) saturate(1.05) drop-shadow(0 10px 14px rgba(0,0,0,0.45))${
                                                f.blur ? ` blur(${f.blur.toFixed(1)}px)` : ""
                                            }`,
                                            // 누끼가 아직 없는 사진은 부드러운 타원 마스크로 배경을 지운다
                                            ...(f.isCutout
                                                ? {}
                                                : {
                                                      WebkitMaskImage:
                                                          "radial-gradient(ellipse 46% 38% at 50% 50%, #000 55%, transparent 78%)",
                                                      maskImage:
                                                          "radial-gradient(ellipse 46% 38% at 50% 50%, #000 55%, transparent 78%)",
                                                  }),
                                        }}
                                    />
                                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-2 py-0.5 rounded-full bg-slate-900/85 text-[11px] text-cyan-100 whitespace-nowrap opacity-0 group-hover/fish:opacity-100 transition-opacity pointer-events-none">
                                        {f.name}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* 비어있을 때 */}
                {fish.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300/70 text-lg px-6 text-center">
                        어종 상세에서 🐟 버튼으로 &quot;내 어항에 담기&quot; 하면 여기서 헤엄쳐요
                    </div>
                )}

                {overflow > 0 && (
                    <div className="absolute top-3 right-3 z-50 px-3 py-1.5 rounded-full bg-slate-900/75 border border-slate-600/60 text-[11px] text-cyan-100/90 backdrop-blur-sm">
                        수조 정원 {TANK_CAPACITY}마리 · 외 {overflow}종은 아래 목록에서
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
                    0% { left: -22%; }
                    50% { left: 100%; }
                    100% { left: -22%; }
                }
                @keyframes aq-flip {
                    0%, 49.99% { transform: scaleX(1); }
                    50%, 100% { transform: scaleX(-1); }
                }
                @keyframes aq-bob {
                    0% { transform: translateY(-9px) rotate(-3deg); }
                    100% { transform: translateY(9px) rotate(3deg); }
                }
                /* 헤엄칠 때 몸이 미세하게 수축·이완 */
                .aq-fish-img {
                    animation: aq-fish-swim 1.7s ease-in-out infinite alternate;
                    transform-origin: 50% 50%;
                }
                @keyframes aq-fish-swim {
                    0% { transform: scaleX(0.97) scaleY(1.02); }
                    100% { transform: scaleX(1.02) scaleY(0.985); }
                }
                .aq-ray {
                    position: absolute;
                    top: -10%;
                    width: 110px;
                    height: 78%;
                    background: linear-gradient(180deg, rgba(170,225,255,0.18), transparent 85%);
                    transform: skewX(-12deg);
                    animation: aq-ray-sway 9s ease-in-out infinite alternate;
                    pointer-events: none;
                }
                @keyframes aq-ray-sway {
                    0% { transform: skewX(-14deg) translateX(-16px); opacity: 0.5; }
                    100% { transform: skewX(-7deg) translateX(16px); opacity: 1; }
                }
                .aq-caustics {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    opacity: 0.16;
                    background:
                        radial-gradient(ellipse 60% 12% at 30% 12%, rgba(200,240,255,0.55), transparent 70%),
                        radial-gradient(ellipse 50% 10% at 70% 22%, rgba(200,240,255,0.4), transparent 70%);
                    animation: aq-caustics-move 11s ease-in-out infinite alternate;
                }
                @keyframes aq-caustics-move {
                    0% { transform: translateX(-3%) scaleY(1); }
                    100% { transform: translateX(3%) scaleY(1.15); }
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
                    100% { transform: translateY(-480px) translateX(14px); opacity: 0; }
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
