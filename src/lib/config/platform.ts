import { db, platformSettings } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface TransactionFeeSettings {
  feeType: "fixed" | "percentage";
  feeValue: number;
  feeMin: number;
  feeMax: number;
  enabled: boolean;
}

export interface PlatformConfig {
  transactionFee: TransactionFeeSettings;
}

const DEFAULT_TRANSACTION_FEE: TransactionFeeSettings = {
  feeType: "percentage",
  feeValue: 0.5,
  feeMin: 500,
  feeMax: 1000,
  enabled: true,
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  transactionFee: DEFAULT_TRANSACTION_FEE,
};

const TRANSACTION_FEE_KEY = "transaction_fee";

export async function getTransactionFeeSettings(): Promise<TransactionFeeSettings> {
  try {
    const [settings] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, TRANSACTION_FEE_KEY))
      .limit(1);

    if (settings && settings.value) {
      const parsed = settings.value as unknown as TransactionFeeSettings;
      return {
        feeType: parsed.feeType || DEFAULT_TRANSACTION_FEE.feeType,
        feeValue: parsed.feeValue ?? DEFAULT_TRANSACTION_FEE.feeValue,
        feeMin: parsed.feeMin ?? DEFAULT_TRANSACTION_FEE.feeMin,
        feeMax: parsed.feeMax ?? DEFAULT_TRANSACTION_FEE.feeMax,
        enabled: parsed.enabled ?? DEFAULT_TRANSACTION_FEE.enabled,
      };
    }

    return DEFAULT_TRANSACTION_FEE;
  } catch (error) {
    console.error("Error fetching transaction fee settings:", error);
    return DEFAULT_TRANSACTION_FEE;
  }
}

export async function updateTransactionFeeSettings(
  settings: Partial<TransactionFeeSettings>
): Promise<TransactionFeeSettings> {
  try {
    const currentSettings = await getTransactionFeeSettings();
    const newSettings: TransactionFeeSettings = {
      ...currentSettings,
      ...settings,
    };

    const [upserted] = await db
      .insert(platformSettings)
      .values({
        key: TRANSACTION_FEE_KEY,
        value: newSettings as unknown as Record<string, unknown>,
        description: "Transaction fee settings for VibeClean platform",
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value: newSettings as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      })
      .returning();

    return upserted.value as unknown as TransactionFeeSettings;
  } catch (error) {
    console.error("Error updating transaction fee settings:", error);
    throw error;
  }
}

export function calculateTransactionFee(
  amount: number,
  settings?: TransactionFeeSettings
): number {
  const feeSettings = settings || DEFAULT_TRANSACTION_FEE;

  if (!feeSettings.enabled) {
    return 0;
  }

  let fee = 0;

  if (feeSettings.feeType === "percentage") {
    fee = (amount * feeSettings.feeValue) / 100;
  } else {
    fee = feeSettings.feeValue;
  }

  if (feeSettings.feeMin !== undefined && fee < feeSettings.feeMin) {
    fee = feeSettings.feeMin;
  }

  if (feeSettings.feeMax !== undefined && fee > feeSettings.feeMax) {
    fee = feeSettings.feeMax;
  }

  return Math.round(fee);
}

export function previewTransactionFee(
  amount: number,
  settings?: TransactionFeeSettings
): {
  fee: number;
  netAmount: number;
  settings: TransactionFeeSettings;
} {
  const feeSettings = settings || DEFAULT_TRANSACTION_FEE;
  const fee = calculateTransactionFee(amount, feeSettings);

  return {
    fee,
    netAmount: amount - fee,
    settings: feeSettings,
  };
}
