# Production Deployment Guide - VibeClean

**Last Updated**: 2026-03-15  
**Platform**: Heroku  
**Database**: Heroku PostgreSQL

---

## 🚀 Deployment Steps

### 1. Push to Git

```bash
git add .
git commit -m "feat: production deployment with QR code migration"
git push origin main
```

### 2. Deploy to Heroku

```bash
# If not already connected
heroku login
heroku git:remote -a vibeclean-production

# Deploy
git push heroku main
```

### 3. Automatic Migration

The build process will automatically run database migrations:

```bash
-----> Build succeeded!
-----> Running postbuild hook...
🚀 Starting production database migration...
📡 Connecting to database...
✅ Connected to database
🔍 Checking branches table schema...
✅ Added qr_logo_url column
✅ Added qr_color_dark column
✅ Added qr_color_light column
🔄 Updating existing branches with default values...
✅ Updated 0 existing branch(es)
✅ Created index on branches.organization_id
📊 Migration verification:
   Total branches: 0
   Branches with logo: 0
   Branches with colors: 0
✅ Migration completed successfully!
👋 Database connection closed
```

### 4. Verify Deployment

```bash
# Open app
heroku open

# Check logs
heroku logs --tail

# Verify database
heroku pg:psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'branches' AND column_name LIKE 'qr%';"
```

---

## 🔧 Manual Migration (If Needed)

If automatic migration fails, run manually:

### Option 1: Via Heroku CLI

```bash
heroku run node scripts/migrate-production.js
```

### Option 2: Via Heroku Postgres Console

```bash
heroku pg:psql

# Then paste SQL from production-migration-branches-qr.sql
```

### Option 3: Via GUI (pgAdmin, DBeaver, etc.)

1. Get database URL: `heroku config:get DATABASE_URL`
2. Connect with your preferred GUI
3. Run SQL from `production-migration-branches-qr.sql`

---

## 📊 Database Schema Verification

After migration, verify columns exist:

```sql
-- Check QR code columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'branches' 
AND column_name IN ('qr_logo_url', 'qr_color_dark', 'qr_color_light');

-- Expected output:
-- column_name   | data_type | column_default
-- --------------+-----------+---------------------------
-- qr_logo_url   | text      | /logo_vibeclean.png
-- qr_color_dark | text      | #1e40af
-- qr_color_light| text      | #ffffff
```

---

## 🐛 Troubleshooting

### Issue: Migration Fails with "relation 'branches' does not exist"

**Solution**: Run full database migration first

```bash
heroku run npm run db:migrate
```

### Issue: Migration Fails with "permission denied"

**Solution**: Ensure DATABASE_URL has proper permissions

```bash
# Check current user
heroku pg:psql -c "SELECT current_user;"

# Grant permissions if needed
heroku pg:psql -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO your-user;"
```

### Issue: Onboarding Still Fails After Migration

**Solution**: Verify migration actually ran

```bash
# Check Heroku build logs
heroku logs --tail --app vibeclean-production | grep "Migration"

# Manually verify columns
heroku pg:psql -c "\d branches"
```

---

## 📝 Environment Variables Required

Make sure these are set in Heroku:

```bash
# Database (automatically set by Heroku Postgres addon)
DATABASE_URL=postgres://...

# Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://your-app.herokuapp.com

# Mayar Payment
MAYAR_ENV=sandbox  # or production
MAYAR_API_KEY=your-mayar-api-key
MAYAR_WEBHOOK_SECRET=your-webhook-secret

# UploadThing
UPLOADTHING_API_KEY=your-uploadthing-key

# Email (Resend)
RESEND_API_KEY=your-resend-key

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.herokuapp.com
```

Set environment variables:

```bash
heroku config:set BETTER_AUTH_SECRET="your-secret-key"
heroku config:set BETTER_AUTH_URL="https://your-app.herokuapp.com"
# ... repeat for all vars
```

---

## ✅ Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] QR code columns exist in branches table
- [ ] Can access homepage without errors
- [ ] Can register new account
- [ ] Can login successfully
- [ ] Can complete onboarding (create organization)
- [ ] Can access dashboard
- [ ] All menu items visible in sidebar
- [ ] Can create first order

---

## 🔄 Rollback Procedure

If deployment fails:

```bash
# Rollback to previous release
heroku rollback

# Or rollback to specific version
heroku rollback v123

# Verify rollback
heroku releases
```

---

## 📈 Monitoring

### Check Build Logs

```bash
heroku logs --tail --source app
```

### Check Database Size

```bash
heroku pg:info
```

### Check Error Rates

```bash
# Filter for errors
heroku logs --tail | grep "Error"
```

---

## 🎯 Success Criteria

Deployment is successful when:

1. ✅ Build completes without errors
2. ✅ Migration runs successfully (check logs for "✅ Migration completed")
3. ✅ New user can register
4. ✅ New user can complete onboarding
5. ✅ No 500 errors in logs
6. ✅ No database constraint errors

---

## 📞 Support

If issues persist:

1. Check full logs: `heroku logs --tail --num 1000`
2. Verify database: `heroku pg:psql`
3. Test locally: `npm run dev`
4. Check Heroku status: https://status.heroku.com

---

**Deploy Frequency**: As needed  
**Downtime**: Zero-downtime deployment  
**Rollback Time**: < 2 minutes
