# Run Migration - Manual Steps

SSH is working! Here's how to run the migration:

## Quick Command (One Line)

```bash
# Replace YOUR_PASSWORD with your actual RDS password
ssh -i ~/Downloads/study-mcp-bastion-key.pem ec2-user@44.201.36.38 \
  "export RDS_PASSWORD='YOUR_PASSWORD' && \
   psql \"postgresql://postgres:\${RDS_PASSWORD}@study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require\" \
   -f ~/002_add_user_credentials.sql"
```

## Or Use the Script

```bash
cd /Users/hamzaammar/Documents/Code/mcp-workspace/d2l-mcp
./RUN_MIGRATION_FINAL.sh
```

It will prompt you for your RDS password.

## Step-by-Step (If You Prefer)

1. **SSH into EC2:**
   ```bash
   ssh -i ~/Downloads/study-mcp-bastion-key.pem ec2-user@44.201.36.38
   ```

2. **Set your RDS password:**
   ```bash
   export RDS_PASSWORD="your-rds-password-here"
   export RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"
   ```

3. **Run the migration:**
   ```bash
   psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
     -f ~/002_add_user_credentials.sql
   ```

4. **Verify it worked:**
   ```bash
   psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
     -c "\d user_credentials"
   ```

You should see the table structure!

## Get Your RDS Password

If you don't remember it, you can:

1. **Check if it's in the connection string:**
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id study-mcp/db-url \
     --region us-east-1 \
     --query 'SecretString' \
     --output text
   ```
   Look for `password=...` in the connection string.

2. **Or reset it** (will restart RDS):
   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier study-mcp-db \
     --master-user-password "NewPassword123!" \
     --apply-immediately \
     --region us-east-1
   ```

## What the Migration Does

Creates the `user_credentials` table to store:
- D2L credentials (host, username, password) per user
- Piazza credentials (email, password) per user

This allows each user to connect their own D2L/Piazza accounts!
