# Database Connectivity Fix

## The Problem

Your backend was getting **504 Gateway Timeout** errors because it couldn't connect to the PostgreSQL database. The error in logs was:

```
Error: connect ETIMEDOUT 172.31.0.87:5432
```

## Root Cause

The RDS security group (`sg-0a8e94c68735d726d`) only allowed connections from a specific IP address (`129.97.125.55/32`), but **not from the ECS security group** (`sg-0fb9af29204b6ac74`).

When ECS tasks tried to connect to the database, the connection was blocked by the security group rules.

## The Fix

Added an inbound rule to the RDS security group to allow PostgreSQL connections (port 5432) from the ECS security group:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0a8e94c68735d726d \
  --protocol tcp \
  --port 5432 \
  --source-group sg-0fb9af29204b6ac74 \
  --region us-east-1
```

## Verify It's Working

After the fix, test the connection:

```bash
# Test health endpoint (should return 200)
curl https://api.hamzaammar.ca/health

# Check backend logs (should no longer show ETIMEDOUT errors)
aws logs tail /ecs/study-mcp-backend --follow --region us-east-1
```

## Network Architecture

- **ECS Service**: Running in VPC `vpc-013be46b13aee1d3a` with security group `sg-0fb9af29204b6ac74`
- **RDS Database**: Running in same VPC `vpc-013be46b13aee1d3a` with security group `sg-0a8e94c68735d726d`
- **Connection**: ECS → RDS on port 5432 (PostgreSQL)

## Security Group Rules (After Fix)

**RDS Security Group (`sg-0a8e94c68735d726d`)** now allows:
- Port 5432 from IP `129.97.125.55/32` (your original IP)
- Port 5432 from ECS security group `sg-0fb9af29204b6ac74` ✅ (newly added)

## If You Need to Revert

To remove the security group rule:

```bash
aws ec2 revoke-security-group-ingress \
  --group-id sg-0a8e94c68735d726d \
  --protocol tcp \
  --port 5432 \
  --source-group sg-0fb9af29204b6ac74 \
  --region us-east-1
```

## Related Issues

- **504 Gateway Timeout**: Backend couldn't reach database → fixed ✅
- **ETIMEDOUT errors**: Network connectivity issue → fixed ✅
- **Dashboard errors**: Database queries failing → should be fixed now ✅
