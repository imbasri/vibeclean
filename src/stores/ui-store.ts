import { create } from 'zustand';

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Dialogs
  isDetailDialogOpen: boolean;
  isPaymentDialogOpen: boolean;
  isCancelDialogOpen: boolean;
  
  setDetailDialogOpen: (open: boolean) => void;
  setPaymentDialogOpen: (open: boolean) => void;
  setCancelDialogOpen: (open: boolean) => void;
  
  // Notifications/Toasts
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  // Dialogs
  isDetailDialogOpen: false,
  isPaymentDialogOpen: false,
  isCancelDialogOpen: false,
  
  setDetailDialogOpen: (open) => set({ isDetailDialogOpen: open }),
  setPaymentDialogOpen: (open) => set({ isPaymentDialogOpen: open }),
  setCancelDialogOpen: (open) => set({ isCancelDialogOpen: open }),
  
  // Toasts
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
