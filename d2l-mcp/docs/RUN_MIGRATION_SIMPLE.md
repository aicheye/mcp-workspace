# Run Migration - Simple Instructions

Your RDS is at: `study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com`

## Option 1: AWS RDS Query Editor (Easiest if Available)

1. Go to **AWS Console** → **RDS** → **Databases** → `study-mcp-db`
2. Look for **Query Editor** or **Query Editor v2** button
3. If available, connect and paste this SQL:

```sql
-- Add user_credentials table for storing D2L and Piazza credentials
create table if not exists public.user_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  service text not null,              -- 'd2l' | 'piazza'
  
  -- D2L fields
  host text,                          -- D2L host (e.g., learn.ul.ie)
  username text,                      -- D2L username
  
  -- Piazza fields  
  email text,                         -- Piazza email
  
  -- Common fields
  password text not null,              -- Password (TODO: encrypt in production)
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint user_credentials_user_service_unique unique (user_id, service)
);

create index if not exists idx_user_credentials_user on public.user_credentials(user_id);
create index if not exists idx_user_credentials_service on public.user_credentials(service);

-- Add updated_at trigger
drop trigger if exists set_user_credentials_updated_at on public.user_credentials;
create trigger set_user_credentials_updated_at
before update on public.user_credentials
for each row execute function public.set_updated_at();

-- Disable RLS for now (enable and add policies in production)
alter table public.user_credentials disable row level security;
```

4. Click **Run**

## Option 2: Use EC2 Bastion (If SSH Works)

If you can SSH to your EC2 instance:

### Step 1: Copy file to EC2
```bash
scp -i ~/Downloads/study-mcp-bastion-key.pem \
  d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql \
  ec2-user@44.201.36.38:~/
```

### Step 2: SSH to EC2
```bash
ssh -i ~/Downloads/study-mcp-bastion-key.pem ec2-user@44.201.36.38
```

### Step 3: Install psql (if needed)
```bash
sudo yum install postgresql15 -y
```

### Step 4: Run migration
```bash
export RDS_PASSWORD="your-rds-password"
export RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"

psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f ~/002_add_user_credentials.sql
```

## Option 3: Install psql Locally + Use AWS Systems Manager

If SSH doesn't work, use AWS Session Manager:

1. Go to **AWS Console** → **EC2** → **Instances**
2. Select instance `i-0734e632d50b6fa26`
3. Click **Connect** → **Session Manager** (if available)
4. Once connected, follow Option 2 steps 3-4

## Option 4: Fix SSH Access First

If SSH is timing out, you may need to:

1. **Check your current IP** and update EC2 security group:
   ```bash
   # Get your IP
   curl ifconfig.me
   
   # Add SSH rule to EC2 security group
   # Go to EC2 → Security Groups → Find your bastion's security group
   # Add inbound rule: SSH (22) from your IP
   ```

2. **Or use AWS Session Manager** (no SSH needed if SSM agent is installed)

## Get Your RDS Password

If you need to find/reset your RDS password:

```bash
# Check Secrets Manager
aws secretsmanager list-secrets --region us-east-1 \
  --query 'SecretList[?contains(Name, `db`) || contains(Name, `rds`)].Name' \
  --output table

# Or reset it (will restart RDS)
aws rds modify-db-instance \
  --db-instance-identifier study-mcp-db \
  --master-user-password "NewPassword123!" \
  --apply-immediately \
  --region us-east-1
```

## Quick Test After Migration

Once migration is done, test from your backend:

```bash
# The backend should now be able to store credentials
# Try connecting D2L/Piazza from the mobile app
```
