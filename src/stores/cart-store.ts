import { create } from 'zustand';
import type { LaundryService } from '@/types';
import type { Coupon } from '@/hooks/use-coupons';
import type { Customer } from '@/types';

export interface CartItem {
  service: LaundryService;
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  discount: number;
  discountType: 'percentage' | 'fixed';
  couponCode: string;
  appliedCoupon: Coupon | null;
  customer: Customer | null;
  paymentMethod: string | null;
  notes: string;
  
  // Actions
  addItem: (service: LaundryService, quantity?: number, notes?: string) => void;
  removeItem: (serviceId: string) => void;
  updateQuantity: (serviceId: string, quantity: number) => void;
  updateNotes: (serviceId: string, notes: string) => void;
  setDiscount: (discount: number, type: 'percentage' | 'fixed') => void;
  applyCoupon: (coupon: Coupon | null, code: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: string | null) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  discountType: 'percentage',
  couponCode: '',
  appliedCoupon: null,
  customer: null,
  paymentMethod: null,
  notes: '',

  addItem: (service, quantity = 1, notes = '') => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.service.id === service.id
      );
      
      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += quantity;
        return { items: newItems };
      }
      
      return {
        items: [...state.items, { service, quantity, notes }],
      };
    });
  },

  removeItem: (serviceId) => {
    set((state) => ({
      items: state.items.filter((item) => item.service.id !== serviceId),
    }));
  },

  updateQuantity: (serviceId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.service.id === serviceId ? { ...item, quantity } : item
      ),
    }));
  },

  updateNotes: (serviceId, notes) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.service.id === serviceId ? { ...item, notes } : item
      ),
    }));
  },

  setDiscount: (discount, type) => {
    set({ discount, discountType: type });
  },

  applyCoupon: (coupon, code) => {
    set({ appliedCoupon: coupon, couponCode: code });
  },

  setCustomer: (customer) => {
    set({ customer });
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  setNotes: (notes) => {
    set({ notes });
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      discountType: 'percentage',
      couponCode: '',
      appliedCoupon: null,
      customer: null,
      paymentMethod: null,
      notes: '',
    });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + item.service.price * item.quantity,
      0
    );
  },

  getDiscountAmount: () => {
    const { discount, discountType, appliedCoupon, getSubtotal } = get();
    const subtotal = getSubtotal();
    
    // If coupon is applied, use coupon discount
    if (appliedCoupon) {
      let couponDiscount = 0;
      if (appliedCoupon.type === 'percentage') {
        couponDiscount = subtotal * (appliedCoupon.value / 100);
        // Apply max discount cap if set
        if (appliedCoupon.maxDiscount && couponDiscount > appliedCoupon.maxDiscount) {
          couponDiscount = appliedCoupon.maxDiscount;
        }
      } else {
        couponDiscount = appliedCoupon.value;
      }
      return couponDiscount;
    }
    
    // Manual discount
    if (discountType === 'percentage') {
      return subtotal * (discount / 100);
    }
    return discount;
  },

  getTotal: () => {
    const { getSubtotal, getDiscountAmount } = get();
    return Math.max(0, getSubtotal() - getDiscountAmount());
  },
}));
