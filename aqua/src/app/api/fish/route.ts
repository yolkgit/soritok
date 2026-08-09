import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // 1. 카테고리 조회 또는 생성
        let category = await prisma.category.findUnique({
            where: { slug: data.categorySlug }
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    name: data.categorySlug, // Simplified since we don't pass Korean name yet
                    slug: data.categorySlug
                }
            });
        }

        // 2. 어종 카드 저장
        const fishCard = await prisma.fishCard.create({
            data: {
                categoryId: category.id,
                name: data.name,

                // Taxonomy
                baseSpecies: data.baseSpecies || null,
                variantName: data.variantName || null,
                grade: data.grade || "기본",
                scientificName: data.scientificName || data.name,

                // Card Summary
                difficultyLevel: data.difficultyLevel || 3,
                pokedexEntry: data.pokedexEntry || "도감 설명 없음",

                // Quick Stats
                temp: data.temp || "24~26°C",
                ph: data.ph || "pH 6.5~7.5",
                diet: data.diet || "소형 사료",
                minTank: data.minTank || "30큐브 이상",
                companionship: data.companionship || "합사 가능",
                maxSize: data.maxSize || "최대 5cm",

                // Wiki Details
                detailHistory: data.detailHistory || null,
                detailAppearance: data.detailAppearance || null,
                detailCare: data.detailCare || null,
                detailBreeding: data.detailBreeding || null,
                detailDisease: data.detailDisease || null,
                detailCompanionship: data.detailCompanionship || null,

                imageUrl: data.imageUrl || "",
                imageAttribution: data.imageAttribution || null,
                cutoutImageUrl: data.cutoutImageUrl || null,
                imageFacing: data.imageFacing || null,
                isPublished: true,
            }
        });

        return NextResponse.json({ success: true, fishCard });
    } catch (error) {
        console.error("DB Save Error:", error);
        return NextResponse.json({ error: "DB 저장 오류" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const cards = await prisma.fishCard.findMany({
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ cards });
    } catch (error) {
        return NextResponse.json({ error: "DB 조회 오류" }, { status: 500 });
    }
}
