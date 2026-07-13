import { FishCardWithCategory } from "@/components/ui/PokemonCard";

export const axolotlDummyData: Partial<FishCardWithCategory> = {
    id: 1,
    name: "우파루파",
    scientificName: "Ambystoma mexicanum",
    attributeTags: "양서류, 담수, 단독사육",
    imageUrl: "https://images.unsplash.com/photo-1662589508535-4330adad61ff?q=80&w=600&auto=format&fit=crop",
    difficultyLevel: 3,
    description: "영원히 유생 상태로 머무르는 독특한 양서류. 외부 아가미가 뿔처럼 귀여운 것이 특징.",
    detailAppearance: "수온 16~20°C의 차가운 물 선호. 수명이 길고 섬세함.",
    detailCare: "바닥재 삼킴 주의(임팩션). 수온 24도 이상 위험.",
    detailCompanionship: "우파루파끼리 합사가 가장 안전. 소형어나 공격적인 개체 합사 금지.",
};

export const nemoDummyData: Partial<FishCardWithCategory> = {
    id: 2,
    name: "흰동가리 (니모)",
    scientificName: "Amphiprioninae",
    attributeTags: "해수어, 소형, 리프세이프",
    imageUrl: "https://images.unsplash.com/photo-1574068468668-a05a11f871da?q=80&w=600&auto=format&fit=crop",
    difficultyLevel: 2,
    description: "말미잘과 공생하는 것으로 유명한 아름다운 해수어. 주황색 바탕에 흰색 줄무늬가 매력적입니다.",
    detailAppearance: "열대 해역의 산호초 주변에 서식. 말미잘의 독침에 면역이 있습니다.",
    detailCare: "해수어이므로 염도 관리가 필수적이며, 말미잘 없이도 사육은 가능합니다.",
    detailCompanionship: "대부분의 순한 해수어와 합사가 가능하나, 너무 큰 육식어종은 피해야 합니다.",
};
