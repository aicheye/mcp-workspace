# Per-User Credentials Setup

## Overview

The backend now supports per-user credentials for D2L and Piazza, stored in the database instead of environment variables. This allows multiple users to connect their own accounts.

## Database Migration

Run this migration on your **AWS RDS PostgreSQL** database:

### Option 1: Using psql (from EC2 or local machine with access)

```bash
# Get your RDS endpoint
RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"

# Run the migration
psql "postgresql://postgres:<PASSWORD>@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql
```

### Option 2: Using AWS RDS Query Editor (if enabled)

1. Go to AWS Console → RDS → Your database
2. Click "Query Editor" (if available)
3. Copy and paste the contents of `002_add_user_credentials.sql`
4. Run the query

### Option 3: Using a database client

Connect to your RDS instance using any PostgreSQL client (DBeaver, pgAdmin, etc.) and run the migration SQL.

**File:** `d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql`

This creates the `user_credentials` table to store credentials per user.

## How It Works

### D2L Authentication

1. **User connects via mobile app:**
   - User enters D2L host, username, and password
   - Credentials are stored in `user_credentials` table

2. **Backend uses credentials:**
   - `getToken(userId)` loads credentials from database for that user
   - Falls back to environment variables if no user credentials found
   - Uses per-user session paths: `~/.d2l-session-{userId}`

3. **API routes:**
   - All `/api/d2l/*` routes now pass `userId` to `getToken(userId)`
   - `D2LClient` accepts `userId` and `host` in constructor
   - Routes create per-user client instances

### Piazza Authentication

1. **User connects via mobile app:**
   - User enters email and password
   - Credentials are stored in `user_credentials` table

2. **Backend uses credentials:**
   - `getPiazzaCookieHeader(userId)` loads credentials from database
   - Falls back to environment variables if no user credentials found
   - Uses per-user session paths: `~/.piazza-session-{userId}`

3. **API routes:**
   - All `/api/piazza/*` routes now pass `userId` to `getPiazzaCookieHeader(userId)`
   - Study tools (piazza_sync, etc.) receive `userId` and pass it through

## Backward Compatibility

- **Environment variables still work:** If no user credentials are found, the system falls back to `D2L_USERNAME`, `D2L_PASSWORD`, `D2L_HOST`, `PIAZZA_USERNAME`, `PIAZZA_PASSWORD`
- **MCP tools:** Tools called via MCP (not REST API) continue to use environment variables since they don't have user context
- **Default client:** The exported `client` singleton still exists for backward compatibility

## Security Notes

⚠️ **Important:** Passwords are currently stored in plain text in the database. For production:

1. **Encrypt passwords** before storing (use `pgcrypto` or application-level encryption)
2. **Enable RLS** on `user_credentials` table
3. **Add proper access policies** to ensure users can only access their own credentials

Example encryption (to be implemented):
```sql
-- Encrypt password before storing
UPDATE user_credentials 
SET password = pgp_sym_encrypt(password, 'encryption_key')
WHERE service = 'd2l';

-- Decrypt when reading
SELECT pgp_sym_decrypt(password, 'encryption_key') as password
FROM user_credentials
WHERE user_id = ? AND service = 'd2l';
```

## Testing

1. **Run migration on RDS:**
   ```bash
   # See RUN_MIGRATION_RDS.md for detailed instructions
   psql "postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/postgres?sslmode=require" \
     -f d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql
   ```

2. **Test connection flow:**
   - Open mobile app → Settings
   - Tap "Connect" for D2L or Piazza
   - Enter credentials
   - Verify status shows "Connected"

3. **Test sync:**
   - After connecting, try syncing
   - Check that data is synced correctly

## Files Changed

### Backend
- `d2l-mcp/src/auth.ts` - Updated to accept `userId` and load from DB
- `d2l-mcp/src/client.ts` - Updated to accept `userId` and `host` in constructor
- `d2l-mcp/src/study/piazzaAuth.ts` - Updated to accept `userId` and load from DB
- `d2l-mcp/src/api/routes.ts` - Updated to pass `userId` to auth functions
- `d2l-mcp/src/study/src/piazza.ts` - Updated to pass `userId` to auth

### Mobile App
- `study-mcp-app/src/screens/Auth/D2LConnectScreen.tsx` - New connection screen
- `study-mcp-app/src/screens/Auth/PiazzaConnectScreen.tsx` - New connection screen
- `study-mcp-app/src/services/d2l.ts` - Updated `connect()` method
- `study-mcp-app/src/services/piazza.ts` - Updated `connect()` method
- `study-mcp-app/src/navigation/AppNavigator.tsx` - Added connection screens
- `study-mcp-app/src/screens/SettingsScreen.tsx` - Navigate to connection screens

## Next Steps

1. ✅ Run database migration
2. ✅ Test D2L connection from mobile app
3. ✅ Test Piazza connection from mobile app
4. ⚠️ **Implement password encryption** (critical for production)
5. ⚠️ **Enable RLS and add access policies** (critical for production)
