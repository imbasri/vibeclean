import { create } from 'zustand';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branchId: string;
  branchName: string;
  isActive: boolean;
}

interface StaffFilters {
  search: string;
  branchFilter: string;
  roleFilter: string;
}

interface StaffState {
  // Staff list
  staff: StaffMember[];
  isLoading: boolean;
  
  // Filters
  filters: StaffFilters;
  
  // Selected staff (for edit/detail)
  selectedStaff: StaffMember | null;
  
  // Actions
  setStaff: (staff: StaffMember[]) => void;
  setIsLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<StaffFilters>) => void;
  resetFilters: () => void;
  setSelectedStaff: (staff: StaffMember | null) => void;
}

const defaultFilters: StaffFilters = {
  search: '',
  branchFilter: 'all',
  roleFilter: 'all',
};

export const useStaffStore = create<StaffState>((set) => ({
  // Initial state
  staff: [],
  isLoading: false,
  filters: { ...defaultFilters },
  selectedStaff: null,
  
  // Actions
  setStaff: (staff) => set({ staff }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  setSelectedStaff: (staff) => set({ selectedStaff: staff }),
}));
