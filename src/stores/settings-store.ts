import { create } from 'zustand';

interface SettingsState {
  // Active tab in settings
  activeTab: 'general' | 'notifications' | 'tax' | 'payment' | 'integration';
  
  // General settings
  generalSettings: {
    businessName: string;
    businessPhone: string;
    businessEmail: string;
    address: string;
  };
  
  // Notification settings
  notificationSettings: {
    orderConfirmation: boolean;
    statusUpdate: boolean;
    paymentReceived: boolean;
    promotional: boolean;
  };
  
  // Actions
  setActiveTab: (tab: SettingsState['activeTab']) => void;
  setGeneralSettings: (settings: Partial<SettingsState['generalSettings']>) => void;
  setNotificationSettings: (settings: Partial<SettingsState['notificationSettings']>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // Initial state
  activeTab: 'general',
  generalSettings: {
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    address: '',
  },
  notificationSettings: {
    orderConfirmation: true,
    statusUpdate: true,
    paymentReceived: true,
    promotional: false,
  },
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGeneralSettings: (settings) => set((state) => ({
    generalSettings: { ...state.generalSettings, ...settings }
  })),
  setNotificationSettings: (settings) => set((state) => ({
    notificationSettings: { ...state.notificationSettings, ...settings }
  })),
}));
