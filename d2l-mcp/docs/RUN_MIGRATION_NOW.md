# Run Migration Now - Quick Guide

You have a bastion EC2 instance ready! Here's how to run the migration:

## Step 1: Copy Migration File to EC2

From your **local machine** (in the mcp-workspace directory):

```bash
# Find your EC2 key file (usually in ~/Downloads or ~/.ssh)
# Replace with your actual key path
scp -i ~/path/to/study-mcp-bastion-key.pem \
  d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql \
  ec2-user@44.201.36.38:~/
```

**If you don't know where your key is:**
```bash
# Search for it
find ~ -name "*bastion*.pem" 2>/dev/null
find ~/Downloads -name "*.pem" 2>/dev/null
```

## Step 2: SSH into EC2

```bash
ssh -i ~/path/to/study-mcp-bastion-key.pem ec2-user@44.201.36.38
```

## Step 3: Install PostgreSQL Client (if needed)

```bash
# Check if psql is installed
psql --version

# If not installed, install it:
sudo yum install postgresql15 -y
```

## Step 4: Run the Migration

On the EC2 instance:

```bash
# Set your RDS password (get it from AWS Secrets Manager or wherever you stored it)
export RDS_PASSWORD="your-rds-password-here"
export RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"

# Run the migration
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f ~/002_add_user_credentials.sql
```

## Step 5: Verify It Worked

```bash
# Check the table was created
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -c "\d user_credentials"
```

You should see the table structure!

## Get Your RDS Password

If you don't remember your RDS password, you can reset it:

```bash
# Reset RDS master password (will require instance restart)
aws rds modify-db-instance \
  --db-instance-identifier study-mcp-db \
  --master-user-password "NewPassword123!" \
  --apply-immediately \
  --region us-east-1
```

Or check if it's stored in AWS Secrets Manager:

```bash
aws secretsmanager list-secrets --region us-east-1 \
  --query 'SecretList[?contains(Name, `db`) || contains(Name, `rds`) || contains(Name, `password`)].Name' \
  --output table
```

## Troubleshooting

### "Permission denied (publickey)"
- Make sure you're using the correct key file
- Check key permissions: `chmod 400 ~/path/to/key.pem`

### "psql: command not found"
- Install it: `sudo yum install postgresql15 -y`

### "Connection refused" or "timeout"
- Check RDS security group allows connections from EC2 security group
- Verify EC2 and RDS are in the same VPC

### "SSL required"
- Make sure `?sslmode=require` is in the connection string
