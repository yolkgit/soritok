import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

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

export async function POST(request: Request) {
    try {
        if (!apiKey) {
            console.error("Gemini API Error: GEMINI_API_KEY is not configured.");
            return NextResponse.json({ error: "서버에 API 키가 설정되지 않았습니다." }, { status: 500 });
        }

        const { category, name } = await request.json();

        if (!name || !category) {
            return NextResponse.json({ error: "어종 이름과 카테고리가 모두 필요합니다." }, { status: 400 });
        }


        // 1. Text Generation with Gemini
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            // @ts-ignore - SDK type definitions might not include googleSearch yet
            tools: [{ googleSearch: {} }] // 구글 검색을 통한 최신 정보 및 사진 기반 데이터 정확도 향상
        });
        const prompt = `[System Instruction]
당신은 '포켓몬스터 도감 작성자'이자 최고 수준의 '어류 생물학자'입니다.
사용자가 어종(예: 알비노 풀레드, 우파루파)을 입력하면, 반드시 아래 JSON 규격에 맞춰 데이터를 생성하세요. 
마크다운(\`\`\`json) 없이 순수 JSON 텍스트만 출력해야 합니다.
**특히 사용자의 입력(이름)에 오타나 속어, 약어(예: 알풀, 씨알이)가 있더라도 그 의도를 파악하여 가장 정확하고 대중적인 표준 한글 어종명으로 자동 교정해야 합니다.**

[CRITICAL INSTRUCTION FOR IMAGE ACCURACY]
당신이 반환하는 'imagePromptKeywords' 필드값은 곧바로 실사 이미지 생성기(Imagen)에 전달됩니다.
실제 물고기 사진(예: L144 안시 롱핀의 경우 노란색 바디, 파란 눈, 길고 넓은 꼬리 지느러미, 쌕쌕이 입 등)을 검색하거나 상상하여, 다음 시각적 특징을 콤마(,)로 구분된 **100% 영문 키워드**로만 나열하세요 (단어 20~30개 내외).
- 정확한 종류 (예: "L144 Ancistrus Pleco")
- 몸의 주조색과 보조색 (예: "bright lemon yellow body")
- 눈동자 색상 (예: "vivid blue eyes")
- 각 지느러미의 형태 (예: "extremely long flowing veil-like fins")
- 기타 무늬 패턴이나 특징적인 외형 (예: "sucker mouth, resting on driftwood")
이 부분은 절대 한국어로 작성하지 말고, 이미지 생성 모델이 즉시 알아듣는 DALL-E/Midjourney 스타일의 강력한 영문 프롬프트 엔지니어링을 적용하세요.

{
  "taxonomy": {
    "correctedName": "오타/약어가 교정된 정확한 대중적 한글명칭",
    "baseSpecies": "원종 (예: 구피)",
    "variantName": "개량종명",
    "scientificName": "학명",
    "grade": "품종 등급 ('기본', '고정', '희귀', '브리딩' 중 택 1)"
  },
  "cardSummary": {
    "difficultyLevel": "사육 난이도(1~5형태의 정수 숫자로만, 예: 3)",
    "pokedexEntry": "포켓몬 카드 도감 스타일의 가슴뛰는 설명 (100자 이내)",
    "quickStats": {
      "temp": "24~26°C", "ph": "pH 6.5~7.5", "diet": "소형 사료", "minTank": "30큐브 이상", "companionship": "단독 사육 추천", "maxSize": "최대 5cm"
    }
  },
  "wikiDetailedContent": {
    "detailHistory": "발견 역사 및 개량 과정",
    "detailAppearance": "한국어로 작성된 상세한 외형 묘사 (체형, 지느러미, 발색 채도 등 도감 본문용)",
    "detailCare": "바닥재, 환경 등 사육 가이드",
    "detailBreeding": "번식 노하우",
    "detailDisease": "주요 질병",
    "detailCompanionship": "합사 가이드",
    "imagePromptKeywords": "여기에 반드시 극도로 세밀한 영문 시각적 키워드만을 콤마로 나열할 것 (예: L144 longfin pleco, bright yellow body, blue eyes, long flowing translucent fins, sucker mouth...)"
  }
}

[Input]
카테고리: ${category}
입력된 이름(오타/속어 포함 가능): ${name}
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean up Markdown JSON formatting if Gemini wraps it
        const cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();

        let parsedData;
        try {
            parsedData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Gemini API Parse Error:", parseError, "Raw Text:", text);
            return NextResponse.json({ error: "생성된 응답을 파싱할 수 없습니다. 다시 시도해주세요." }, { status: 500 });
        }

        // 2. Image Generation Prompt Builder
        // 앞서 생성된 한국어 상세 설명 대신, 영문 키워드 모음인 `imagePromptKeywords`를 직접 프롬프트로 생성.
        const imagePromptKeywords = parsedData.wikiDetailedContent.imagePromptKeywords || "tropical fish";
        const imagePrompt = buildImageGenerationPrompt(category, parsedData.taxonomy.correctedName || parsedData.taxonomy.variantName || parsedData.taxonomy.baseSpecies || name, imagePromptKeywords);
        console.log("Generated Image API Prompt:", imagePrompt);

        // 3. Image Generation with Gemini API (gemini-3-flash-image or imagen-3.0-generate-001)
        let imageUrl = `https://images.unsplash.com/photo-1544551763-92ab472cad5d?q=80&w=600&auto=format&fit=crop`; // Fallback image
        try {
            // Google의 가장 최신 이미지 모델 imagen-4.0-generate-001 사용
            const imageModelName = "imagen-4.0-generate-001";
            const imageResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModelName}:predict?key=${apiKey}`, {
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
                difficultyLevel: parseInt(parsedData.cardSummary.difficultyLevel) || 3,
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
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: error.message || "데이터 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
