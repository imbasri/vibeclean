-- ============================================
-- VibeClean - Balance Tables Migration
-- Run this on production database
-- ============================================

-- Create organization_balances table if not exists
CREATE TABLE IF NOT EXISTS organization_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_earnings numeric(15,2) DEFAULT '0',
  available_balance numeric(15,2) DEFAULT '0',
  pending_balance numeric(15,2) DEFAULT '0',
  total_withdrawn numeric(15,2) DEFAULT '0',
  last_transaction_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create balance_transactions table if not exists
CREATE TABLE IF NOT EXISTS balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id uuid,
  type varchar(50) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'pending',
  amount numeric(15,2) NOT NULL,
  fee_amount numeric(15,2) DEFAULT '0',
  net_amount numeric(15,2) NOT NULL,
  description text,
  reference_id varchar(255),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_balances_org_id 
  ON organization_balances(organization_id);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_org_id 
  ON balance_transactions(organization_id);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_order_id 
  ON balance_transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_type 
  ON balance_transactions(type);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_status 
  ON balance_transactions(status);

-- Initialize balance for all existing organizations
INSERT INTO organization_balances (organization_id, total_earnings, available_balance, pending_balance, total_withdrawn)
SELECT id, '0', '0', '0', '0'
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM organization_balances)
ON CONFLICT (id) DO NOTHING;

-- Verify tables created
SELECT 'organization_balances' as table_name, count(*) as row_count FROM organization_balances
UNION ALL
SELECT 'balance_transactions' as table_name, count(*) as row_count FROM balance_transactions;
