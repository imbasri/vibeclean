import { create } from 'zustand';
import type { LaundryService } from '@/types';

interface ServiceState {
  services: LaundryService[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchServices: () => Promise<void>;
  createService: (data: any) => Promise<LaundryService | null>;
  updateService: (id: string, data: any) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  isLoading: false,
  error: null,

  fetchServices: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      set({ services: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
    }
  },

  createService: async (data: any) => {
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create service');
      const newService = await response.json();
      
      // Update local state
      set((state) => ({
        services: [...state.services, newService],
      }));
      
      return newService;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  updateService: async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update service');
      
      // Update local state
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? { ...s, ...data } : s)),
      }));
      
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  deleteService: async (id: string) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete service');
      
      // Update local state
      set((state) => ({
        services: state.services.filter((s) => s.id !== id),
      }));
      
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
