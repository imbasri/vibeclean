import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface BalanceTransaction {
  id: string;
  type: 'payment_received' | 'fee_deducted' | 'withdrawal' | 'refund' | 'adjustment';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  feeAmount: number;
  netAmount: number;
  description: string;
  referenceId: string;
  orderId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface Withdrawal {
  id: string;
  organizationId: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  processedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

export interface BalanceData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  lastTransactionAt: Date | null;
}

// ============================================
// STATE INTERFACE
// ============================================

interface BalanceState {
  // Balance
  balance: BalanceData | null;
  
  // Transactions
  transactions: BalanceTransaction[];
  
  // Withdrawals
  withdrawals: Withdrawal[];
  
  // UI State
  isLoading: boolean;
  isWithdrawing: boolean;
  error: string | null;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface BalanceActions {
  // Balance
  fetchBalance: () => Promise<void>;
  getBalanceData: () => BalanceData | null;
  
  // Transactions
  fetchTransactions: (limit?: number) => Promise<void>;
  getTransactionById: (id: string) => Promise<BalanceTransaction>;
  
  // Withdrawals
  requestWithdrawal: (data: WithdrawalRequest) => Promise<void>;
  fetchWithdrawals: () => Promise<void>;
  cancelWithdrawal: (id: string) => Promise<void>;
  
  // Local actions
  clearError: () => void;
  reset: () => void;
}

export interface WithdrawalRequest {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

// ============================================
// STORE TYPE
// ============================================

type BalanceStore = BalanceState & BalanceActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: BalanceState = {
  balance: null,
  transactions: [],
  withdrawals: [],
  isLoading: false,
  isWithdrawing: false,
  error: null,
};

// ============================================
// API HELPERS
// ============================================

const api = {
  get: async <T>(url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Request failed');
    }
    return res.json() as T;
  },
  
  post: async <T, D = unknown>(url: string, data?: D) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Request failed');
    }
    return res.json() as T;
  },
};

// ============================================
// STORE
// ============================================

export const useBalanceStore = create<BalanceStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // ============================================
      // BALANCE ACTIONS
      // ============================================
      
      fetchBalance: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ balance: BalanceData }>('/api/balance');
          set({ balance: data.balance, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch balance';
          set({ error: message, isLoading: false });
        }
      },
      
      getBalanceData: () => {
        return get().balance;
      },
      
      // ============================================
      // TRANSACTION ACTIONS
      // ============================================
      
      fetchTransactions: async (limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ transactions: BalanceTransaction[] }>('/api/balance');
          // Parse dates
          const transactions = data.transactions.map(t => ({
            ...t,
            createdAt: new Date(t.createdAt),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          }));
          set({ transactions, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
          set({ error: message, isLoading: false });
        }
      },
      
      getTransactionById: async (id: string) => {
        try {
          const data = await api.get<{ transactions: BalanceTransaction[] }>('/api/balance');
          const transaction = data.transactions.find(t => t.id === id);
          if (!transaction) throw new Error('Transaction not found');
          return {
            ...transaction,
            createdAt: new Date(transaction.createdAt),
            completedAt: transaction.completedAt ? new Date(transaction.completedAt) : undefined,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch transaction';
          set({ error: message });
          throw error;
        }
      },
      
      // ============================================
      // WITHDRAWAL ACTIONS
      // ============================================
      
      requestWithdrawal: async (data: WithdrawalRequest) => {
        set({ isWithdrawing: true, error: null });
        try {
          const result = await api.post<{ message: string }>('/api/balance/withdraw', data);
          
          // Show success message (caller should handle toast)
          console.log('Withdrawal successful:', result.message);
          
          // Refresh balance and transactions
          await get().fetchBalance();
          await get().fetchTransactions();
          
          set({ isWithdrawing: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to request withdrawal';
          set({ error: message, isWithdrawing: false });
          throw error;
        }
      },
      
      fetchWithdrawals: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ withdrawals: Withdrawal[] }>('/api/withdrawals');
          // Parse dates
          const withdrawals = data.withdrawals.map(w => ({
            ...w,
            createdAt: new Date(w.createdAt),
            processedAt: w.processedAt ? new Date(w.processedAt) : undefined,
            rejectedAt: w.rejectedAt ? new Date(w.rejectedAt) : undefined,
          }));
          set({ withdrawals, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch withdrawals';
          set({ error: message, isLoading: false });
        }
      },
      
      cancelWithdrawal: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(`/api/withdrawals/${id}/cancel`);
          await get().fetchWithdrawals();
          await get().fetchBalance();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel withdrawal';
          set({ error: message, isLoading: false });
        }
      },
      
      // ============================================
      // LOCAL ACTIONS
      // ============================================
      
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'balance-store',
    }
  )
);
