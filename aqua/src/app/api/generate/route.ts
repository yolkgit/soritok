import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

// 텍스트(도감 글작성): Claude — 소리톡/slow7 전체에서 쓰는 Anthropic API 사용
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

// 도감 데이터 JSON 스키마 — structured outputs 로 항상 유효한 JSON 을 보장.
// 상세 섹션은 백과사전 분량(문단 여러 개)을 요구한다.
const FISH_CARD_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["taxonomy", "cardSummary", "wikiDetailedContent"],
    properties: {
        taxonomy: {
            type: "object",
            additionalProperties: false,
            required: ["correctedName", "baseSpecies", "variantName", "scientificName", "grade"],
            properties: {
                correctedName: { type: "string", description: "오타/약어가 교정된 정확한 대중적 한글명칭" },
                baseSpecies: { type: "string", description: "원종 (예: 구피). 해당 없으면 '없음'" },
                variantName: { type: "string", description: "개량종명. 해당 없으면 '없음'" },
                scientificName: { type: "string", description: "정확한 라틴어 학명 (속명+종명). 개량종이면 원종의 학명. 모르면 '없음'" },
                grade: { type: "string", enum: ["기본", "고정", "희귀", "브리딩"] },
            },
        },
        cardSummary: {
            type: "object",
            additionalProperties: false,
            required: ["difficultyLevel", "pokedexEntry", "quickStats"],
            properties: {
                difficultyLevel: { type: "integer", description: "사육 난이도 1~5" },
                pokedexEntry: { type: "string", description: "포켓몬 카드 도감 스타일의 가슴뛰는 설명 (100자 이내)" },
                quickStats: {
                    type: "object",
                    additionalProperties: false,
                    required: ["temp", "ph", "diet", "minTank", "companionship", "maxSize"],
                    properties: {
                        temp: { type: "string", description: "예: 24~26°C" },
                        ph: { type: "string", description: "예: pH 6.5~7.5" },
                        diet: { type: "string", description: "예: 소형 사료" },
                        minTank: { type: "string", description: "예: 30큐브 이상" },
                        companionship: { type: "string", description: "예: 단독 사육 추천" },
                        maxSize: { type: "string", description: "예: 최대 5cm" },
                    },
                },
            },
        },
        wikiDetailedContent: {
            type: "object",
            additionalProperties: false,
            required: [
                "detailHistory",
                "detailAppearance",
                "detailCare",
                "detailBreeding",
                "detailDisease",
                "detailCompanionship",
            ],
            properties: {
                detailHistory: {
                    type: "string",
                    description:
                        "원산지와 자연 서식지(수계·수질·기후), 학술적 발견과 명명의 역사, 관상어로 도입된 경위, 주요 개량 품종의 계보까지 400~600자 이상, 2~3개 문단(문단은 빈 줄로 구분)으로 상세 서술",
                },
                detailAppearance: {
                    type: "string",
                    description:
                        "체형·표준 체장·체색과 발색 매커니즘, 각 지느러미의 형태, 암수 구분 포인트(성적 이형), 성장 단계별 외형 변화, 유사종과의 구별법까지 400~600자 이상, 여러 문단으로 자세히 묘사",
                },
                detailCare: {
                    type: "string",
                    description:
                        "적정 수온·pH·경도(GH/KH), 권장 수조 크기와 마릿수, 여과 방식, 바닥재·조명·수초/은신처 구성, 먹이 종류와 급여 횟수·양, 물갈이 주기와 요령, 초보자가 자주 하는 실수까지 500~800자 이상의 실전 사육 가이드",
                },
                detailBreeding: {
                    type: "string",
                    description:
                        "암수 구분법, 번식 유도 조건(수온·먹이·환경), 산란/출산 과정과 주기, 치어 분리와 먹이(인퓨조리아·브라인쉬림프 등), 치어 성장 단계와 생존율 높이는 요령까지 400~600자 이상",
                },
                detailDisease: {
                    type: "string",
                    description:
                        "이 어종이 잘 걸리는 질병 3가지 이상을 각각 증상→원인→치료법→예방법 순으로 정리, 검역 요령 포함 400~600자 이상",
                },
                detailCompanionship: {
                    type: "string",
                    description:
                        "성격과 영역성, 합사하기 좋은 어종과 이유, 피해야 할 어종과 이유, 같은 종끼리의 적정 비율과 마릿수, 합사 시 주의할 세팅까지 300~500자 이상",
                },
            },
        },
    },
} as const;

const SYSTEM_PROMPT = `당신은 '포켓몬스터 도감 작성자'이자 관상어 전문 백과사전의 수석 편집자, 그리고 최고 수준의 '어류 생물학자'입니다.
사용자가 어종(예: 알비노 풀레드, 우파루파)을 입력하면, 주어진 JSON 규격에 맞춰 백과사전 수준의 도감 데이터를 생성하세요.
**사용자의 입력(이름)에 오타나 속어, 약어(예: 알풀, 씨알이)가 있더라도 그 의도를 파악하여 가장 정확하고 대중적인 표준 한글 어종명으로 자동 교정해야 합니다.**

[집필 원칙]
- wikiDetailedContent 의 각 섹션은 읽을거리가 풍부한 백과사전 문체로, 요구된 분량을 반드시 채우세요.
- 문단은 빈 줄(\\n\\n)로 구분하고, 구체적 수치(수온, pH, 크기, 주기 등)와 실전 노하우를 포함하세요.
- 사실에 근거해 쓰되, 확실하지 않은 세부 수치는 통용되는 안전 범위로 제시하세요.
- scientificName 은 사진 검색에 사용되므로 반드시 정확한 라틴어 학명을 쓰세요 (개량종은 원종 학명).`;

// ─────────── iNaturalist 실사진 검색 (무료, CC 라이선스) ───────────
const OK_LICENSES = new Set(["cc0", "cc-by", "cc-by-sa", "pd"]);
const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1544551763-92ab472cad5d?q=80&w=600&auto=format&fit=crop";

async function fetchJson(url: string, timeoutMs = 15000) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "soritok-aquado/1.0 (aquarium encyclopedia)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/**
 * 학명으로 iNaturalist 에서 상업적 사용 가능한 CC 라이선스 실사진을 찾아
 * uploads 볼륨에 저장하고 { imageUrl, attribution } 을 반환.
 * 실패하면 fallback 이미지를 반환한다.
 */
async function findRealPhoto(scientificName: string): Promise<{ imageUrl: string; attribution: string | null }> {
    try {
        if (!scientificName || scientificName === "없음" || scientificName === "Unknown") {
            return { imageUrl: FALLBACK_IMAGE, attribution: null };
        }

        // 1) 학명으로 분류군 검색
        const search = await fetchJson(
            `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=3`,
        );
        const taxon = (search.results || []).find((t: any) => t?.id);
        if (!taxon) return { imageUrl: FALLBACK_IMAGE, attribution: null };

        // 2) 분류군 상세에서 라이선스 허용 사진 고르기 (cc0/cc-by/cc-by-sa)
        const detail = await fetchJson(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
        const photos: any[] = (detail.results?.[0]?.taxon_photos || []).map((tp: any) => tp.photo).filter(Boolean);
        const photo = photos.find((p) => OK_LICENSES.has(String(p.license_code || "").toLowerCase()));
        if (!photo?.url) return { imageUrl: FALLBACK_IMAGE, attribution: null };

        // 3) 큰 사이즈로 다운로드 (square → large, 실패 시 medium)
        let buffer: Buffer | null = null;
        for (const size of ["large", "medium"]) {
            try {
                const imgRes = await fetch(String(photo.url).replace("square", size), {
                    signal: AbortSignal.timeout(20000),
                });
                const ct = imgRes.headers.get("content-type") || "";
                if (imgRes.ok && ct.startsWith("image/")) {
                    buffer = Buffer.from(await imgRes.arrayBuffer());
                    break;
                }
            } catch {
                /* 다음 사이즈 시도 */
            }
        }
        if (!buffer) return { imageUrl: FALLBACK_IMAGE, attribution: null };

        const uploadDir = path.join(process.cwd(), "public/uploads");
        await mkdir(uploadDir, { recursive: true });
        const filename = `photo_${Date.now()}_${Math.floor(Math.random() * 100000)}.jpg`;
        await writeFile(path.join(uploadDir, filename), buffer);

        const attribution = photo.attribution ? `${photo.attribution} · iNaturalist` : "iNaturalist";
        return { imageUrl: `/aqua/uploads/${filename}`, attribution };
    } catch (e) {
        console.error("iNaturalist photo lookup failed:", e);
        return { imageUrl: FALLBACK_IMAGE, attribution: null };
    }
}

// ─────────── 도감 데이터 생성 본체 ───────────
async function generateCard(category: string, name: string) {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        output_config: {
            effort: "high",
            format: { type: "json_schema", schema: FISH_CARD_SCHEMA },
        },
        messages: [
            {
                role: "user",
                content: `카테고리: ${category}\n입력된 이름(오타/속어 포함 가능): ${name}`,
            },
        ],
    });

    if (response.stop_reason === "refusal") {
        return { error: "요청을 처리할 수 없습니다. 다른 어종명으로 시도해주세요." };
    }

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    let parsedData: any;
    try {
        parsedData = JSON.parse(text);
    } catch (parseError) {
        console.error("Claude API Parse Error:", parseError, "Raw Text:", text.slice(0, 500));
        return { error: "생성된 응답을 파싱할 수 없습니다. 다시 시도해주세요." };
    }

    // 실사진 검색 (학명 기반, iNaturalist CC 라이선스)
    const sciName =
        parsedData.taxonomy.scientificName && parsedData.taxonomy.scientificName !== "없음"
            ? parsedData.taxonomy.scientificName
            : "";
    const { imageUrl, attribution } = await findRealPhoto(sciName);

    return {
        result: {
            // Taxonomy
            baseSpecies: parsedData.taxonomy.baseSpecies === "없음" ? null : (parsedData.taxonomy.baseSpecies || null),
            variantName: parsedData.taxonomy.variantName === "없음" ? null : (parsedData.taxonomy.variantName || null),
            grade: parsedData.taxonomy.grade || "기본",
            name:
                parsedData.taxonomy.correctedName ||
                (parsedData.taxonomy.variantName !== "없음" ? parsedData.taxonomy.variantName : null) ||
                (parsedData.taxonomy.baseSpecies !== "없음" ? parsedData.taxonomy.baseSpecies : null) ||
                name,
            scientificName:
                parsedData.taxonomy.scientificName === "없음" ? "Unknown" : (parsedData.taxonomy.scientificName || "Unknown"),
            categorySlug: category,
            imageUrl,
            imageAttribution: attribution,

            // Card Summary
            difficultyLevel: Number(parsedData.cardSummary.difficultyLevel) || 3,
            pokedexEntry: parsedData.cardSummary.pokedexEntry || "도감 설명 정보 없음",

            // Quick Stats
            temp: parsedData.cardSummary.quickStats.temp || "24~26°C",
            ph: parsedData.cardSummary.quickStats.ph || "pH 6.5~7.5",
            diet: parsedData.cardSummary.quickStats.diet || "소형 사료",
            minTank: parsedData.cardSummary.quickStats.minTank || "30큐브 이상",
            companionship: parsedData.cardSummary.quickStats.companionship || "합사 가능",
            maxSize: parsedData.cardSummary.quickStats.maxSize || "최대 5cm",

            // Wiki Details
            detailHistory: parsedData.wikiDetailedContent.detailHistory || "",
            detailAppearance: parsedData.wikiDetailedContent.detailAppearance || "",
            detailCare: parsedData.wikiDetailedContent.detailCare || "",
            detailBreeding: parsedData.wikiDetailedContent.detailBreeding || "",
            detailDisease: parsedData.wikiDetailedContent.detailDisease || "",
            detailCompanionship: parsedData.wikiDetailedContent.detailCompanionship || "",
        },
    };
}

export async function POST(request: Request) {
    if (!anthropicKey) {
        console.error("Claude API Error: ANTHROPIC_API_KEY is not configured.");
        return NextResponse.json({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { category, name } = body;
    if (!name || !category) {
        return NextResponse.json({ error: "어종 이름과 카테고리가 모두 필요합니다." }, { status: 400 });
    }

    // 백과사전 분량 생성은 1~2분 걸릴 수 있음 → keep-alive 공백을 흘려보내
    // 프록시(60초 idle) 타임아웃을 피한다. (JSON 앞의 공백은 JSON.parse 에 유효)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const ping = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(" "));
                } catch {
                    clearInterval(ping);
                }
            }, 10000);
            try {
                const payload = await generateCard(String(category), String(name));
                controller.enqueue(encoder.encode(JSON.stringify(payload)));
            } catch (e: any) {
                console.error("Claude API Error:", e);
                controller.enqueue(
                    encoder.encode(JSON.stringify({ error: e?.message || "데이터 생성 중 오류가 발생했습니다." })),
                );
            } finally {
                clearInterval(ping);
                try {
                    controller.close();
                } catch {
                    /* already closed */
                }
            }
        },
    });

    return new Response(stream, {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
}
