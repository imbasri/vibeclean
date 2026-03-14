import { create } from 'zustand';

interface TaxSettings {
  ppn: { enabled: boolean; rate: number };
  pph: { enabled: boolean; rate: number };
}

interface ReportsState {
  // Period filter
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  
  // Active tab
  activeTab: 'ringkasan' | 'transaksi' | 'pajak' | 'analytics';
  
  // Tax settings (local state for now)
  taxSettings: TaxSettings;
  
  // Actions
  setPeriod: (period: 'today' | 'week' | 'month' | 'quarter' | 'year') => void;
  setActiveTab: (tab: 'ringkasan' | 'transaksi' | 'pajak' | 'analytics') => void;
  setTaxSettings: (settings: Partial<TaxSettings>) => void;
}

const defaultTaxSettings: TaxSettings = {
  ppn: { enabled: true, rate: 11 },
  pph: { enabled: false, rate: 2 },
};

export const useReportsStore = create<ReportsState>((set) => ({
  // Initial state
  period: 'week',
  activeTab: 'ringkasan',
  taxSettings: { ...defaultTaxSettings },
  
  // Actions
  setPeriod: (period) => set({ period }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTaxSettings: (settings) => set((state) => ({
    taxSettings: {
      ppn: { ...state.taxSettings.ppn, ...(settings.ppn || {}) },
      pph: { ...state.taxSettings.pph, ...(settings.pph || {}) },
    }
  })),
}));
