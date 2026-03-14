# Balance Tables Migration Guide

## Problem
Balance page returns 500 error because database tables `organization_balances` and `balance_transactions` don't exist in production database.

## Solution

### Option 1: Run Migration Script (Recommended)

**Prerequisites:**
- Node.js installed
- Database URL available

**Steps:**

1. **Set DATABASE_URL environment variable:**
   ```bash
   # Windows (PowerShell)
   $env:DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

   # Mac/Linux
   export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
   ```

2. **Run migration script:**
   ```bash
   npm run migrate-balance
   ```

3. **Verify migration:**
   ```
   ✅ Migration completed successfully!
   organization_balances: X rows
   balance_transactions: X rows
   ```

---

### Option 2: Run SQL Manually

**For Heroku:**
```bash
heroku pg:psql --app your-app-name -f scripts/create-balance-tables.sql
```

**For Other Databases:**
```bash
psql $DATABASE_URL -f scripts/create-balance-tables.sql
```

---

### Option 3: Run SQL Commands Directly

Connect to your database and run:

```sql
-- Create organization_balances table
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

-- Create balance_transactions table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_balances_org_id 
  ON organization_balances(organization_id);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_org_id 
  ON balance_transactions(organization_id);

-- Initialize balances for existing organizations
INSERT INTO organization_balances (organization_id, total_earnings, available_balance, pending_balance, total_withdrawn)
SELECT id, '0', '0', '0', '0'
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM organization_balances);
```

---

## Verify Migration

**Check tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organization_balances', 'balance_transactions');
```

**Test API:**
```bash
# Should return 200 OK with balance data (not 500 error)
curl https://your-domain.com/api/balance
```

---

## For Specific Platforms

### Heroku
```bash
# Set environment variable
heroku config:set DATABASE_URL="your-url"

# Run migration
heroku run npm run migrate-balance
```

### Vercel
```bash
# Use Vercel CLI
vercel env pull  # Get environment variables
npm run migrate-balance
```

### DigitalOcean App Platform
```bash
# In App Platform console > Settings > Environment Variables
# Add DATABASE_URL
# Then run: npm run migrate-balance
```

### Self-hosted (VPS)
```bash
# SSH into server
ssh user@your-server.com

# Navigate to app directory
cd /path/to/vibeclean

# Set environment variable
export DATABASE_URL="your-url"

# Run migration
npm run migrate-balance
```

---

## Troubleshooting

### Error: "relation 'organizations' does not exist"
**Solution:** Make sure you're connecting to the correct database that has the VibeClean schema.

### Error: "permission denied for schema public"
**Solution:** Grant permissions:
```sql
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Error: "DATABASE_URL is required"
**Solution:** Set the DATABASE_URL environment variable before running the script.

### Migration runs but balance page still shows 0
**Solution:** This is expected for new organizations. Balance will populate when orders are created.

---

## Files Created

1. `scripts/migrate-balance-tables.js` - Node.js migration script
2. `scripts/create-balance-tables.sql` - Raw SQL migration
3. `scripts/MIGRATION_GUIDE.md` - This guide

---

## Support

If you encounter issues:
1. Check database connection
2. Verify DATABASE_URL is correct
3. Ensure user has proper permissions
4. Check PostgreSQL version (12+ recommended)

For help, contact support or check application logs.
