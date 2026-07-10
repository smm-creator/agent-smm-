import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // Brand profile
      brand: {
        name: '',
        niche: '',
        targetAudience: '',
        tone: 'friendly',
        goal: 'awareness',
        usp: '',
      },

      // Selected platforms
      selectedPlatforms: ['telegram', 'instagram'],

      // Custom platform configs (overrides defaults)
      platformConfigs: {},

      // Generated strategy
      strategy: null,

      // Generated post ideas
      postIdeas: [],

      // Loading states
      loading: false,
      generatingIdeas: false,

      // UI state
      activeTab: 'setup',
      activePlatform: 'telegram',

      // Actions
      setBrand: (brandData) => set({ brand: { ...get().brand, ...brandData } }),

      togglePlatform: (platformId) => {
        const { selectedPlatforms } = get();
        if (selectedPlatforms.includes(platformId)) {
          if (selectedPlatforms.length > 1) {
            set({ selectedPlatforms: selectedPlatforms.filter(p => p !== platformId) });
          }
        } else {
          set({ selectedPlatforms: [...selectedPlatforms, platformId] });
        }
      },

      updatePlatformConfig: (platformId, config) => {
        set({
          platformConfigs: {
            ...get().platformConfigs,
            [platformId]: { ...get().platformConfigs[platformId], ...config },
          },
        });
      },

      setStrategy: (strategy) => set({ strategy }),
      setPostIdeas: (ideas) => set({ postIdeas: ideas }),
      setLoading: (loading) => set({ loading }),
      setGeneratingIdeas: (generatingIdeas) => set({ generatingIdeas }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActivePlatform: (platform) => set({ activePlatform: platform }),

      resetAll: () => set({
        brand: { name: '', niche: '', targetAudience: '', tone: 'friendly', goal: 'awareness', usp: '' },
        strategy: null,
        postIdeas: [],
        activeTab: 'setup',
      }),
    }),
    {
      name: 'smm-agent-storage',
      partialize: (state) => ({
        brand: state.brand,
        selectedPlatforms: state.selectedPlatforms,
        platformConfigs: state.platformConfigs,
        strategy: state.strategy,
        postIdeas: state.postIdeas,
      }),
    }
  )
);

export default useStore;
