# Easiest Way to Run Migration

Since SSH and Session Manager aren't working, here's the **simplest approach**:

## Option 1: Use a Database Client Tool (Recommended)

Install a PostgreSQL client on your Mac and connect directly:

### Step 1: Install PostgreSQL Client

```bash
brew install postgresql
```

### Step 2: Get Your RDS Password

```bash
# Check if it's in Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id study-mcp/db-url \
  --region us-east-1 \
  --query 'SecretString' \
  --output text
```

The password is in the connection string: `postgresql://postgres:PASSWORD@...`

### Step 3: Connect and Run Migration

```bash
cd /Users/hamzaammar/Documents/Code/mcp-workspace/d2l-mcp

# Set your password (extract from connection string above)
export RDS_PASSWORD="your-password-here"

# Connect and run migration
psql "postgresql://postgres:${RDS_PASSWORD}@study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require" \
  -f src/study/db/migrations/002_add_user_credentials.sql
```

**Note:** This will only work if your RDS security group allows connections from your IP. If it doesn't, you'll need to add your IP to the RDS security group first.

## Option 2: Use a GUI Database Client

1. **Install DBeaver** (free): https://dbeaver.io/download/
2. **Create new connection:**
   - Type: PostgreSQL
   - Host: `study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: (from Secrets Manager)
   - SSL: Enable, Mode: `require`
3. **Connect**
4. **Open SQL Editor**
5. **Copy and paste** the contents of `MIGRATION_SQL.sql`
6. **Run**

## Option 3: Enable RDS Public Access Temporarily

If you need to connect from your local machine:

1. **Go to AWS Console** → **RDS** → **Databases** → `study-mcp-db`
2. **Modify** → **Connectivity**
3. **Public access**: Change to **Yes** (temporarily)
4. **Update RDS security group** to allow your IP:
   ```bash
   # Get your IP
   MY_IP=$(curl -s https://api.ipify.org)
   
   # Get RDS security group
   RDS_SG=$(aws rds describe-db-instances \
     --db-instance-identifier study-mcp-db \
     --region us-east-1 \
     --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
     --output text)
   
   # Add rule
   aws ec2 authorize-security-group-ingress \
     --group-id $RDS_SG \
     --protocol tcp \
     --port 5432 \
     --cidr ${MY_IP}/32 \
     --region us-east-1
   ```
5. **Run migration** (Option 1, Step 3)
6. **Disable public access** after (for security)

## Option 4: Run from ECS Task (Advanced)

You could also run the migration SQL directly from your backend code on first startup, but that's more complex.

## Quick Check: Can You Connect?

Test if you can connect to RDS:

```bash
# Try connecting (will prompt for password)
psql "postgresql://postgres@study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"
```

If it connects, you're good! If it times out, you need to enable public access or add your IP to the security group.
