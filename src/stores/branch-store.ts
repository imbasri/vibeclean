import { create } from 'zustand';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  qrCodeColor?: string;
}

interface BranchFilters {
  search: string;
  statusFilter: string;
}

interface BranchState {
  // Branch list
  branches: Branch[];
  isLoading: boolean;
  
  // Filters
  filters: BranchFilters;
  
  // Selected branch
  selectedBranch: Branch | null;
  
  // Actions
  setBranches: (branches: Branch[]) => void;
  setIsLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<BranchFilters>) => void;
  resetFilters: () => void;
  setSelectedBranch: (branch: Branch | null) => void;
}

const defaultFilters: BranchFilters = {
  search: '',
  statusFilter: 'all',
};

export const useBranchStore = create<BranchState>((set) => ({
  // Initial state
  branches: [],
  isLoading: false,
  filters: { ...defaultFilters },
  selectedBranch: null,
  
  // Actions
  setBranches: (branches) => set({ branches }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  setSelectedBranch: (branch) => set({ selectedBranch: branch }),
}));
