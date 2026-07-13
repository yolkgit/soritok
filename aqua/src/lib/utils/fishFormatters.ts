import { FishCard, Category } from "@prisma/client";
import { FishEXData } from "@/components/FishCard";

// We define a more explicit interface since Prisma's FishCard might have outdated types locally
export interface FishCardWithCategory {
    id: number;
    categoryId: number;
    name: string;
    scientificName?: string | null;
    baseSpecies?: string | null;
    variantName?: string | null;
    grade?: string | null;
    imageUrl: string;
    isPublished: boolean;
    category?: {
        name: string;
        slug: string;
    } | null;

    difficultyLevel: number;
    pokedexEntry: string;
    temp: string;
    ph: string;
    diet: string;
    minTank: string;
    companionship: string;
    maxSize: string;

    detailHistory?: string | null;
    detailAppearance?: string | null;
    detailCare?: string | null;
    detailBreeding?: string | null;
    detailDisease?: string | null;
    detailCompanionship?: string | null;
}

/**
 * Maps the database FishCard schema to the new EX style interface required by FishCard.tsx.
 * @param card The raw FishCard data from Prisma, optionally including its Category.
 * @returns Formatted FishEXData
 */
export function mapToEXData(card: FishCardWithCategory): FishEXData {
    // 1. Determine grade
    let grade: FishEXData["grade"] = "기본";
    if (card.grade && ["기본", "고정", "희귀", "브리딩"].includes(card.grade)) {
        grade = card.grade as FishEXData["grade"];
    }

    // 2. Determine element from category slug
    let element: FishEXData["element"] = "water";
    const primaryTag = card.category?.name || "";
    if (primaryTag.includes("해수") || card.category?.slug === "saltwater") element = "water";
    else if (primaryTag.includes("수초") || card.category?.slug === "plants") element = "plant";
    else if (primaryTag.includes("양서") || card.category?.slug === "amphibians") element = "dark";
    else if (primaryTag.includes("무척추") || card.category?.slug === "invertebrates") element = "light";

    // 3. Extract max size
    const maxSize = card.maxSize || "10cm";

    // 4. Temperament
    const temperamentTag = "개체 차이"; // Or fallback

    // Parse name and scientificName from card.name if scientificName is empty
    let parsedName = card.name;
    let parsedScientificName = card.scientificName || "Unknown";
    const nameMatch = card.name.match(/^(.*?)\s*\((.*?)\)$/);
    if (nameMatch) {
        parsedName = nameMatch[1].trim();
        if (parsedScientificName === "Unknown" || parsedScientificName === card.name) {
            parsedScientificName = nameMatch[2].trim();
        }
    }

    // Use explicitly requested diet or default
    const parsedDiet = card.diet || "일반 사료/잡식";

    return {
        grade,
        baseSpecies: card.baseSpecies === "없음" ? null : (card.baseSpecies || null),
        variantName: card.variantName === "없음" ? null : (card.variantName || null),
        name: parsedName,
        scientificName: parsedScientificName,
        maxSize,
        imageUrl: card.imageUrl,
        element,
        temperament: temperamentTag || "평화로움",
        pokedexEntry: card.pokedexEntry || "설명이 없습니다.",
        conditions: {
            temp: card.temp || "22~26°C",
            ph: card.ph || "pH 6.5~7.5",
            diet: parsedDiet,
        },
        weakness: card.detailDisease ? "질병 유의" : "수질 오염",
        resistance: card.companionship || "합사 가능",
        minTank: card.minTank || "30큐브 이상",
        retreatCost: card.difficultyLevel || 1,
        difficultyLevel: card.difficultyLevel || 1,
        warnings: card.detailCare?.slice(0, 100) || "안전하고 행복한 사육 공간을 제공해 주세요.",
    };
}
