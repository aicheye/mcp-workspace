#!/bin/bash
# Run migration on RDS via EC2 bastion

echo "🚀 Running migration on RDS..."
echo ""

# Get RDS password from user
read -sp "Enter your RDS password: " RDS_PASSWORD
echo ""

RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"

# Run migration via SSH
ssh -i ~/Downloads/study-mcp-bastion-key.pem ec2-user@44.201.36.38 << EOF
export RDS_PASSWORD="${RDS_PASSWORD}"
export RDS_ENDPOINT="${RDS_ENDPOINT}"

echo "Running migration..."
psql "postgresql://postgres:\${RDS_PASSWORD}@\${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
  -f ~/002_add_user_credentials.sql

if [ \$? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "Verifying table creation..."
  psql "postgresql://postgres:\${RDS_PASSWORD}@\${RDS_ENDPOINT}:5432/postgres?sslmode=require" \
    -c "\d user_credentials"
else
  echo ""
  echo "❌ Migration failed. Check the error above."
fi
EOF
