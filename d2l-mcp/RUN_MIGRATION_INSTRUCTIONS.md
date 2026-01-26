# How to Run the Migration

Your EC2 doesn't have SSH access configured. Here are your options:

## ✅ Option 1: AWS RDS Query Editor (Easiest!)

1. **Go to AWS Console** → **RDS** → **Databases** → Click `study-mcp-db`
2. Look for **"Query Editor"** or **"Query Editor v2"** button (top right)
3. If you see it:
   - Click it
   - Connect to your database (use master username: `postgres`)
   - Copy the entire contents of `MIGRATION_SQL.sql` (in this directory)
   - Paste and click **Run**

**If Query Editor is not available**, use Option 2.

## ✅ Option 2: AWS Systems Manager Session Manager (No SSH Needed!)

1. **Go to AWS Console** → **EC2** → **Instances**
2. Select instance: `i-0734e632d50b6fa26` (study-mcp-bastion)
3. Click **Connect** button (top right)
4. Choose **Session Manager** tab
5. Click **Connect**

Once connected to EC2 via Session Manager:

```bash
# Install PostgreSQL client
sudo yum install postgresql15 -y

# Get RDS password (you'll need to enter it)
# It might be in Secrets Manager or you set it when creating RDS

# Copy the migration SQL (I'll provide it below, or you can create it)
cat > ~/migration.sql << 'EOF'
-- Paste contents of MIGRATION_SQL.sql here
EOF

# Run migration
export RDS_PASSWORD="your-password"
psql "postgresql://postgres:${RDS_PASSWORD}@study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require" \
  -f ~/migration.sql
```

## ✅ Option 3: Enable SSH Access (Then Use Option 2 from docs)

If you want to use SSH:

1. **Get your current IP:**
   ```bash
   curl ifconfig.me
   ```

2. **Add SSH rule to EC2 security group:**
   ```bash
   # Get security group ID
   SG_ID="sg-0013713b3a882d887"  # From your EC2 instance
   
   # Add SSH rule
   aws ec2 authorize-security-group-ingress \
     --group-id $SG_ID \
     --protocol tcp \
     --port 22 \
     --cidr $(curl -s ifconfig.me)/32 \
     --region us-east-1
   ```

3. Then SSH and run migration (see `RUN_MIGRATION_SIMPLE.md`)

## ✅ Option 4: Install psql Locally + Use VPN

If you have VPN access to your VPC, you can run it locally:

```bash
# Install PostgreSQL client
brew install postgresql

# Run migration
export RDS_PASSWORD="your-password"
psql "postgresql://postgres:${RDS_PASSWORD}@study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require" \
  -f d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql
```

## 📋 Migration SQL

The SQL is in `MIGRATION_SQL.sql` in this directory. Copy and paste it into Query Editor or save it on EC2.

## 🔑 Get Your RDS Password

If you don't remember your RDS password:

```bash
# Check Secrets Manager
aws secretsmanager list-secrets --region us-east-1 \
  --query 'SecretList[?contains(Name, `db`) || contains(Name, `rds`) || contains(Name, `password`)].Name' \
  --output table

# Or check the secret value (if stored)
aws secretsmanager get-secret-value \
  --secret-id study-mcp/db-url \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | grep -oP 'password=\K[^@]+' || echo "Password not in connection string"
```

## ✅ Verify Migration

After running, verify the table exists:

```sql
-- In Query Editor or psql
\d user_credentials
```

You should see the table with all columns!
