# How to Run the Migration on AWS RDS

Your RDS database is **not publicly accessible**, so you have a few options:

## Option 1: Use AWS RDS Query Editor (Easiest) ⭐

If your RDS instance has Query Editor enabled:

1. Go to **AWS Console** → **RDS** → **Databases** → `study-mcp-db`
2. Click **Query Editor** (or **Query Editor v2**)
3. Connect to your database
4. Copy and paste the contents of `d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql`
5. Click **Run**

**Note:** Query Editor might not be enabled. If you don't see it, use Option 2 or 3.

## Option 2: Use an EC2 Instance (Recommended)

If you have an EC2 instance in the same VPC as RDS:

### Step 1: SSH into EC2

```bash
# Replace with your EC2 IP and key
ssh -i ~/path/to/your-key.pem ec2-user@<EC2_IP>
```

### Step 2: Install PostgreSQL Client

```bash
# Amazon Linux
sudo yum install postgresql15 -y

# Ubuntu
sudo apt update && sudo apt install postgresql-client -y
```

### Step 3: Copy Migration File to EC2

From your **local machine**:

```bash
# Copy the migration file to EC2
scp -i ~/path/to/your-key.pem \
  d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql \
  ec2-user@<EC2_IP>:~/
```

### Step 4: Run Migration on EC2

Back in your EC2 SSH session:

```bash
# Set your RDS password (or enter it when prompted)
export RDS_PASSWORD="your-rds-password"
export RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"

# Run the migration
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f ~/002_add_user_credentials.sql
```

## Option 3: Install psql Locally + Use VPN/Bastion

If you want to run it from your Mac:

### Step 1: Install PostgreSQL Client

```bash
# macOS
brew install postgresql

# Verify installation
psql --version
```

### Step 2: Set Up SSH Tunnel (if using bastion)

```bash
# Create SSH tunnel through EC2 to RDS
ssh -i ~/path/to/your-key.pem \
  -L 5432:study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com:5432 \
  ec2-user@<EC2_IP> -N

# Keep this terminal open, open a new terminal for next step
```

### Step 3: Run Migration

In a **new terminal**:

```bash
cd /Users/hamzaammar/Documents/Code/mcp-workspace/d2l-mcp

# Connect through localhost tunnel
export RDS_PASSWORD="your-rds-password"

psql "postgresql://postgres:${RDS_PASSWORD}@localhost:5432/postgres?sslmode=require" \
  -f src/study/db/migrations/002_add_user_credentials.sql
```

## Option 4: Use AWS Systems Manager Session Manager

If your EC2 has SSM agent installed:

1. Go to **AWS Console** → **EC2** → **Instances**
2. Select your EC2 instance
3. Click **Connect** → **Session Manager**
4. Install psql and run migration (same as Option 2, Step 2-4)

## Verify Migration Worked

After running, check the table exists:

```bash
# From EC2 or through tunnel
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -c "\d user_credentials"
```

You should see the table with columns: `id`, `user_id`, `service`, `host`, `username`, `email`, `password`, `created_at`, `updated_at`.

## Quick Check: Do You Have an EC2 Instance?

Run this to see if you have any EC2 instances:

```bash
aws ec2 describe-instances --region us-east-1 \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].{InstanceId:InstanceId,PublicIP:PublicIpAddress,Name:Tags[?Key==`Name`].Value|[0]}' \
  --output table
```

If you see instances, you can use Option 2. If not, you might need to create a bastion EC2 instance first (see `EC2-BASTION-SETUP.md`).
