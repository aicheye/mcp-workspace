#!/bin/bash
# Quick script to run the migration on RDS via EC2 bastion

BASTION_IP="44.201.36.38"
BASTION_KEY="~/Downloads/study-mcp-bastion-key.pem"
RDS_ENDPOINT="study-mcp-db.cunwmoma690l.us-east-1.rds.amazonaws.com"
MIGRATION_FILE="d2l-mcp/src/study/db/migrations/002_add_user_credentials.sql"

echo "📋 Step 1: Copying migration file to EC2..."
scp -i ~/Downloads/study-mcp-bastion-key.pem \
  "$MIGRATION_FILE" \
  ec2-user@${BASTION_IP}:~/ 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Failed to copy file. Check your key path and EC2 IP."
  exit 1
fi

echo ""
echo "✅ File copied! Now SSH into EC2 and run:"
echo ""
echo "ssh -i ~/Downloads/study-mcp-bastion-key.pem ec2-user@${BASTION_IP}"
echo ""
echo "Then on EC2, run:"
echo ""
echo "export RDS_PASSWORD='your-password-here'"
echo "psql \"postgresql://postgres:\${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/postgres?sslmode=require\" \\"
echo "  -f ~/002_add_user_credentials.sql"
echo ""
