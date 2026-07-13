import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// 텍스트(도감 글작성): Claude — 소리톡/slow7 전체에서 쓰는 Anthropic API 사용
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
// 이미지 생성(Imagen)용 Google 키는 그대로 유지
const geminiKey = process.env.GEMINI_API_KEY || "";

/**
 * 어종 정보를 바탕으로 이미지 생성 AI에게 보낼 최적화된 프롬프트를 생성합니다.
 * @param category - 어종 카테고리 (예: "양서류", "열대어", "새우")
 * @param speciesName - 어종 세부 이름 (예: "우파루파", "베타", "CRS")
 * @returns 이미지 생성 API에 전송할 완성된 영문 프롬프트 문자열
 */
function buildImageGenerationPrompt(category: string, speciesName: string, imagePromptKeywords: string): string {
    // 1. 기본 스타일 정의: 고품질의 사실적인 자연 생태 사진 느낌 ('nanobanana2' 트리거 워드 포함)
    const baseStyle =
        "nanobanana2 style, A highly detailed, ultra-realistic nature photography style image. ";

    // 2. 피사체 및 구도 정의 (키워드 기반 결합)
    // 피사체가 크게 나와서 잘리는 것을 방지하기 위해 줌아웃(zoomed out, wide-angle shot) 및 여백(plenty of margins)을 강조하는 프롬프트 추가
    const subjectDescription = `The main subject is [ ${imagePromptKeywords} ]. It is positioned in the center of the frame. Wide-angle shot, zoomed out. The entire full body of the subject must be completely visible within the frame with plenty of margins and empty space around it, do NOT crop any part of the subject. Make it look like a real, living animal captured by a camera, not an illustration or a cartoon. `;

    // 3. 외형 및 배경 디테일: 생성된 상세 텍스트(키워드)를 반영
    const atmosphere =
        `The background is a beautiful, slightly blurred wide natural aquatic or terrarium environment showing more of the habitat, suitable for this specific creature. Cinematic lighting.`;

    // 최종 프롬프트 조합
    return baseStyle + subjectDescription + atmosphere;
}

// 도감 데이터 JSON 스키마 — structured outputs 로 항상 유효한 JSON 을 보장
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
                scientificName: { type: "string", description: "학명. 모르면 '없음'" },
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
                "imagePromptKeywords",
            ],
            properties: {
                detailHistory: { type: "string", description: "발견 역사 및 개량 과정" },
                detailAppearance: { type: "string", description: "한국어로 작성된 상세한 외형 묘사 (체형, 지느러미, 발색 채도 등 도감 본문용)" },
                detailCare: { type: "string", description: "바닥재, 환경 등 사육 가이드" },
                detailBreeding: { type: "string", description: "번식 노하우" },
                detailDisease: { type: "string", description: "주요 질병" },
                detailCompanionship: { type: "string", description: "합사 가이드" },
                imagePromptKeywords: {
                    type: "string",
                    description:
                        "실사 이미지 생성기에 바로 전달할 100% 영문 시각 키워드를 콤마로 나열 (단어 20~30개 내외)",
                },
            },
        },
    },
} as const;

const SYSTEM_PROMPT = `당신은 '포켓몬스터 도감 작성자'이자 최고 수준의 '어류 생물학자'입니다.
사용자가 어종(예: 알비노 풀레드, 우파루파)을 입력하면, 주어진 JSON 규격에 맞춰 도감 데이터를 생성하세요.
**특히 사용자의 입력(이름)에 오타나 속어, 약어(예: 알풀, 씨알이)가 있더라도 그 의도를 파악하여 가장 정확하고 대중적인 표준 한글 어종명으로 자동 교정해야 합니다.**

[CRITICAL INSTRUCTION FOR IMAGE ACCURACY]
당신이 반환하는 'imagePromptKeywords' 필드값은 곧바로 실사 이미지 생성기(Imagen)에 전달됩니다.
실제 물고기 사진(예: L144 안시 롱핀의 경우 노란색 바디, 파란 눈, 길고 넓은 꼬리 지느러미, 쌕쌕이 입 등)의 시각적 특징을 콤마(,)로 구분된 **100% 영문 키워드**로만 나열하세요 (단어 20~30개 내외).
- 정확한 종류 (예: "L144 Ancistrus Pleco")
- 몸의 주조색과 보조색 (예: "bright lemon yellow body")
- 눈동자 색상 (예: "vivid blue eyes")
- 각 지느러미의 형태 (예: "extremely long flowing veil-like fins")
- 기타 무늬 패턴이나 특징적인 외형 (예: "sucker mouth, resting on driftwood")
이 부분은 절대 한국어로 작성하지 말고, 이미지 생성 모델이 즉시 알아듣는 DALL-E/Midjourney 스타일의 강력한 영문 프롬프트 엔지니어링을 적용하세요.`;

export async function POST(request: Request) {
    try {
        if (!anthropicKey) {
            console.error("Claude API Error: ANTHROPIC_API_KEY is not configured.");
            return NextResponse.json({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
        }

        const { category, name } = await request.json();

        if (!name || !category) {
            return NextResponse.json({ error: "어종 이름과 카테고리가 모두 필요합니다." }, { status: 400 });
        }

        // 1. Text Generation with Claude (structured outputs → 항상 유효한 JSON)
        const anthropic = new Anthropic({ apiKey: anthropicKey });
        const response = await anthropic.messages.create({
            model: "claude-sonnet-5",
            max_tokens: 16000,
            system: SYSTEM_PROMPT,
            output_config: {
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
            return NextResponse.json({ error: "요청을 처리할 수 없습니다. 다른 어종명으로 시도해주세요." }, { status: 500 });
        }

        const text = response.content.find((b) => b.type === "text")?.text ?? "";

        let parsedData;
        try {
            parsedData = JSON.parse(text);
        } catch (parseError) {
            console.error("Claude API Parse Error:", parseError, "Raw Text:", text);
            return NextResponse.json({ error: "생성된 응답을 파싱할 수 없습니다. 다시 시도해주세요." }, { status: 500 });
        }

        // 2. Image Generation Prompt Builder
        // 앞서 생성된 한국어 상세 설명 대신, 영문 키워드 모음인 `imagePromptKeywords`를 직접 프롬프트로 생성.
        const imagePromptKeywords = parsedData.wikiDetailedContent.imagePromptKeywords || "tropical fish";
        const imagePrompt = buildImageGenerationPrompt(category, parsedData.taxonomy.correctedName || parsedData.taxonomy.variantName || parsedData.taxonomy.baseSpecies || name, imagePromptKeywords);
        console.log("Generated Image API Prompt:", imagePrompt);

        // 3. Image Generation with Gemini API (imagen-4.0-generate-001) — 기존 유지
        let imageUrl = `https://images.unsplash.com/photo-1544551763-92ab472cad5d?q=80&w=600&auto=format&fit=crop`; // Fallback image
        try {
            if (!geminiKey) throw new Error("GEMINI_API_KEY not configured — skip image generation");
            const imageModelName = "imagen-4.0-generate-001";
            const imageResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModelName}:predict?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instances: [
                        { prompt: imagePrompt }
                    ],
                    parameters: {
                        sampleCount: 1,
                        outputOptions: { mimeType: "image/jpeg" }
                    }
                })
            });

            if (imageResponse.ok) {
                const imageJson = await imageResponse.json();
                if (imageJson.predictions && imageJson.predictions.length > 0) {
                    const base64Image = imageJson.predictions[0].bytesBase64Encoded;
                    if (base64Image) {
                        imageUrl = `data:image/jpeg;base64,${base64Image}`;
                    }
                }
            } else {
                console.error("Gemini Image API Error Output:", await imageResponse.text());
                // 실패 시 Fallback URL을 그대로 유지합니다.
            }
        } catch (imgError) {
            console.error("Gemini Image request failed:", imgError);
        }

        return NextResponse.json({
            result: {
                // Taxonomy
                baseSpecies: parsedData.taxonomy.baseSpecies === "없음" ? null : (parsedData.taxonomy.baseSpecies || null),
                variantName: parsedData.taxonomy.variantName === "없음" ? null : (parsedData.taxonomy.variantName || null),
                grade: parsedData.taxonomy.grade || "기본",
                name: parsedData.taxonomy.correctedName || (parsedData.taxonomy.variantName !== "없음" ? parsedData.taxonomy.variantName : null) || (parsedData.taxonomy.baseSpecies !== "없음" ? parsedData.taxonomy.baseSpecies : null) || name,
                scientificName: parsedData.taxonomy.scientificName === "없음" ? "Unknown" : (parsedData.taxonomy.scientificName || "Unknown"),
                categorySlug: category,
                imageUrl: imageUrl,

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
            }
        });

    } catch (error: any) {
        console.error("Claude API Error:", error);
        return NextResponse.json({ error: error.message || "데이터 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
