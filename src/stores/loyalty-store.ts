import { create } from 'zustand';
import type { Coupon } from '@/hooks/use-coupons';

interface MembershipTier {
  id: string;
  name: string;
  tier: string;
  minSpending: string;
  discountPercentage: string;
  pointMultiplier: string;
  isActive: boolean;
}

interface TierFormData {
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  minSpending: string;
  discountPercentage: string;
  pointMultiplier: string;
  isActive: boolean;
}

interface CouponFormData {
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'all' | 'category' | 'service';
  category: string;
  serviceId: string;
  minOrderAmount: number;
  maxDiscount: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

const defaultTierFormData: TierFormData = {
  name: '',
  tier: 'bronze',
  minSpending: '0',
  discountPercentage: '0',
  pointMultiplier: '1',
  isActive: true,
};

const defaultCouponFormData: CouponFormData = {
  code: '',
  description: '',
  type: 'percentage',
  value: 0,
  scope: 'all',
  category: '',
  serviceId: '',
  minOrderAmount: 0,
  maxDiscount: 0,
  usageLimit: null,
  perUserLimit: null,
  validFrom: '',
  validUntil: '',
  isActive: true,
};

interface LoyaltyState {
  // Tabs
  activeTab: 'tiers' | 'coupons';
  
  // Tiers
  tiers: MembershipTier[];
  isLoadingTiers: boolean;
  showTierDialog: boolean;
  editingTier: MembershipTier | null;
  tierFormData: TierFormData;
  
  // Coupons
  coupons: Coupon[];
  isLoadingCoupons: boolean;
  showCouponDialog: boolean;
  editingCoupon: Coupon | null;
  couponFormData: CouponFormData;
  
  // Actions
  setActiveTab: (tab: 'tiers' | 'coupons') => void;
  setTiers: (tiers: MembershipTier[]) => void;
  setIsLoadingTiers: (loading: boolean) => void;
  setShowTierDialog: (show: boolean) => void;
  setEditingTier: (tier: MembershipTier | null) => void;
  setTierFormData: (data: Partial<TierFormData>) => void;
  resetTierFormData: () => void;
  
  setCoupons: (coupons: Coupon[]) => void;
  setIsLoadingCoupons: (loading: boolean) => void;
  setShowCouponDialog: (show: boolean) => void;
  setEditingCoupon: (coupon: Coupon | null) => void;
  setCouponFormData: (data: Partial<CouponFormData>) => void;
  resetCouponFormData: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>((set) => ({
  // Initial state
  activeTab: 'tiers',
  
  // Tiers
  tiers: [],
  isLoadingTiers: false,
  showTierDialog: false,
  editingTier: null,
  tierFormData: { ...defaultTierFormData },
  
  // Coupons
  coupons: [],
  isLoadingCoupons: false,
  showCouponDialog: false,
  editingCoupon: null,
  couponFormData: { ...defaultCouponFormData },
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setTiers: (tiers) => set({ tiers }),
  setIsLoadingTiers: (loading) => set({ isLoadingTiers: loading }),
  setShowTierDialog: (show) => set({ showTierDialog: show }),
  setEditingTier: (tier) => set({ editingTier: tier }),
  setTierFormData: (data) => set((state) => ({
    tierFormData: { ...state.tierFormData, ...data }
  })),
  resetTierFormData: () => set({ tierFormData: { ...defaultTierFormData }, editingTier: null }),
  
  setCoupons: (coupons) => set({ coupons }),
  setIsLoadingCoupons: (loading) => set({ isLoadingCoupons: loading }),
  setShowCouponDialog: (show) => set({ showCouponDialog: show }),
  setEditingCoupon: (coupon) => set({ editingCoupon: coupon }),
  setCouponFormData: (data) => set((state) => ({
    couponFormData: { ...state.couponFormData, ...data }
  })),
  resetCouponFormData: () => set({ couponFormData: { ...defaultCouponFormData }, editingCoupon: null }),
}));
