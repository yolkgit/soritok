import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AquariumState {
    savedFishIds: number[];
    addFish: (id: number) => void;
    removeFish: (id: number) => void;
    toggleFish: (id: number) => void;
    hasFish: (id: number) => boolean;
}

export const useAquariumStore = create<AquariumState>()(
    persist(
        (set, get) => ({
            savedFishIds: [],
            addFish: (id) => set((state) => {
                if (!state.savedFishIds.includes(id)) {
                    return { savedFishIds: [...state.savedFishIds, id] };
                }
                return state;
            }),
            removeFish: (id) => set((state) => ({
                savedFishIds: state.savedFishIds.filter((fishId) => fishId !== id)
            })),
            toggleFish: (id) => set((state) => {
                const exists = state.savedFishIds.includes(id);
                if (exists) {
                    return { savedFishIds: state.savedFishIds.filter((fishId) => fishId !== id) };
                } else {
                    return { savedFishIds: [...state.savedFishIds, id] };
                }
            }),
            hasFish: (id) => get().savedFishIds.includes(id)
        }),
        {
            name: "aquarium-storage", // name of the item in the storage (must be unique)
        }
    )
);
