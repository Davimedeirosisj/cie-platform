import { create } from "zustand";
import { persist } from "zustand/middleware";

type CampaignStore = {
  selectedCampanhaId: string | null;
  setSelectedCampanhaId: (id: string) => void;
};

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set) => ({
      selectedCampanhaId: null,
      setSelectedCampanhaId: (id) => set({ selectedCampanhaId: id }),
    }),
    { name: "cie-campaign-selecionada" },
  ),
);
