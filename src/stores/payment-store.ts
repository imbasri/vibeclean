import { create } from 'zustand';

interface PaymentState {
  // Current payment being processed
  isProcessing: boolean;
  currentOrderId: string | null;
  currentAmount: number | null;

  // Payment result
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  paymentId: string | null;
  transactionId: string | null;
  expiredAt: string | null;

  // Payment checking (for success page polling)
  isChecking: boolean;
  paymentStatus: 'checking' | 'paid' | 'failed' | 'expired';
  lastCheckedAt: Date | null;

  // Error handling
  error: string | null;
  errorCode: string | null;

  // Actions
  startPayment: (orderId: string, amount: number) => void;
  setPaymentResult: (result: {
    paymentUrl?: string | null;
    qrCodeUrl?: string | null;
    paymentId?: string;
    transactionId?: string;
    expiredAt?: string;
  }) => void;
  setError: (error: string, errorCode?: string) => void;
  clearPayment: () => void;
  
  // Payment checking actions
  startChecking: () => void;
  setPaymentStatus: (status: 'checking' | 'paid' | 'failed' | 'expired') => void;
  setPaymentChecked: (orderData?: any) => void;
  resetChecking: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  // Initial state
  isProcessing: false,
  currentOrderId: null,
  currentAmount: null,
  paymentUrl: null,
  qrCodeUrl: null,
  paymentId: null,
  transactionId: null,
  expiredAt: null,
  isChecking: false,
  paymentStatus: 'checking',
  lastCheckedAt: null,
  error: null,
  errorCode: null,

  // Start payment process
  startPayment: (orderId, amount) => {
    set({
      isProcessing: true,
      currentOrderId: orderId,
      currentAmount: amount,
      error: null,
      errorCode: null,
      isChecking: false,
      paymentStatus: 'checking',
    });
  },

  // Set payment result
  setPaymentResult: (result) => {
    set({
      isProcessing: false,
      paymentUrl: result.paymentUrl || null,
      qrCodeUrl: result.qrCodeUrl || null,
      paymentId: result.paymentId || null,
      transactionId: result.transactionId || null,
      expiredAt: result.expiredAt || null,
      error: null,
      errorCode: null,
      isChecking: false,
      paymentStatus: 'checking',
    });
  },

  // Set error
  setError: (error, errorCode) => {
    set({
      isProcessing: false,
      error,
      errorCode: errorCode || 'UNKNOWN_ERROR',
      paymentUrl: null,
      qrCodeUrl: null,
      paymentId: null,
      transactionId: null,
      expiredAt: null,
      isChecking: false,
      paymentStatus: 'failed',
    });
  },

  // Clear all payment state
  clearPayment: () => {
    set({
      isProcessing: false,
      currentOrderId: null,
      currentAmount: null,
      paymentUrl: null,
      qrCodeUrl: null,
      paymentId: null,
      transactionId: null,
      expiredAt: null,
      isChecking: false,
      paymentStatus: 'checking',
      lastCheckedAt: null,
      error: null,
      errorCode: null,
    });
  },
  
  // Payment checking actions (for success page)
  startChecking: () => {
    set({
      isChecking: true,
      paymentStatus: 'checking',
      lastCheckedAt: new Date(),
    });
  },
  
  setPaymentStatus: (status) => {
    set({
      paymentStatus: status,
      isChecking: status === 'checking',
      lastCheckedAt: new Date(),
    });
  },
  
  setPaymentChecked: (orderData) => {
    set({
      isChecking: false,
      paymentStatus: orderData?.isPaid ? 'paid' : 'checking',
      lastCheckedAt: new Date(),
      currentOrderId: orderData?.id || null,
      currentAmount: orderData?.amount ? parseFloat(orderData.amount) : null,
    });
  },
  
  resetChecking: () => {
    set({
      isChecking: false,
      paymentStatus: 'checking',
      lastCheckedAt: null,
    });
  },
}));
