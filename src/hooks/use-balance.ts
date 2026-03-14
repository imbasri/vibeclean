import { useState, useEffect, useCallback } from "react";

interface BalanceData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  lastTransactionAt: Date | null;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  description: string;
  referenceId: string;
  createdAt: Date;
  completedAt: Date | null;
}

interface BalanceResponse {
  balance: BalanceData;
  transactions: Transaction[];
}

interface UseBalanceReturn {
  balance: BalanceData | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBalance(): UseBalanceReturn {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/balance", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Use detailed message if available
        const errorMessage = errorData.message || errorData.error || "Failed to fetch balance";
        throw new Error(errorMessage);
      }

      const data: BalanceResponse = await response.json();

      setBalance({
        ...data.balance,
        lastTransactionAt: data.balance.lastTransactionAt 
          ? new Date(data.balance.lastTransactionAt) 
          : null,
      });

      setTransactions(data.transactions.map(t => ({
        ...t,
        createdAt: new Date(t.createdAt),
        completedAt: t.completedAt ? new Date(t.completedAt) : null,
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      setError(message);
      console.error("Error fetching balance:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    transactions,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

interface WithdrawalRequest {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

interface WithdrawalResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export async function requestWithdrawal(data: WithdrawalRequest): Promise<WithdrawalResponse> {
  try {
    const response = await fetch("/api/balance/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to process withdrawal",
      };
    }

    return {
      success: true,
      transactionId: result.transactionId,
      message: result.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      success: false,
      error: message,
    };
  }
}
