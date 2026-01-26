# Run Migration on AWS RDS

## Prerequisites

Make sure you've already run the main schema (`schema.sql`) which includes:
- `pgcrypto` extension (for `gen_random_uuid()`)
- `vector` extension (for pgvector)
- `set_updated_at()` function

If you haven't, run `schema.sql` first, then this migration.

## Quick Command

```bash
# Set your RDS endpoint and password
export RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"
export RDS_PASSWORD="your-password-here"

# Run the migration
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql
```

## From EC2 Instance

If you have an EC2 instance with access to RDS:

```bash
# SSH into your EC2 instance
ssh ec2-user@your-ec2-ip

# Install PostgreSQL client if needed
sudo yum install postgresql15 -y  # Amazon Linux
# OR
sudo apt install postgresql-client -y  # Ubuntu

# Run migration
cd /path/to/mcp-workspace/d2l-mcp
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f src/study/db/migrations/002_add_user_credentials.sql
```

## From Local Machine

If your RDS has public access (or you're using a VPN/bastion):

```bash
# Make sure you have psql installed
# macOS: brew install postgresql
# Linux: sudo apt install postgresql-client

cd /path/to/mcp-workspace/d2l-mcp
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f src/study/db/migrations/002_add_user_credentials.sql
```

## Verify Migration

After running, verify the table was created:

```bash
psql "postgresql://postgres:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -c "\d user_credentials"
```

You should see the table structure with columns: `id`, `user_id`, `service`, `host`, `username`, `email`, `password`, `created_at`, `updated_at`.

## Troubleshooting

### Connection Refused
- Check RDS security group allows PostgreSQL (5432) from your IP
- Verify RDS endpoint is correct
- Check if RDS is in a private subnet (need VPN/bastion)

### SSL Required
- RDS requires SSL, make sure `?sslmode=require` is in the connection string

### Table Already Exists
- If you see "relation already exists", the migration already ran
- You can safely ignore or drop and recreate if needed
