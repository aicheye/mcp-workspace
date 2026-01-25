# Your Backend Status

## Current Situation

Your backend is running on **ECS Fargate** but **NO TASKS ARE CURRENTLY RUNNING**.

- **Cluster**: `study-mcp-cluster`
- **Service**: `study-mcp-backend`
- **Desired Count**: 1 task
- **Running Count**: 0 tasks ❌
- **Status**: Tasks are failing to start

This is why you're getting 503 errors - the service isn't running!

## How to Fix

### Step 1: Check Why Tasks Are Failing

```bash
# View recent stopped tasks
aws ecs list-tasks \
  --cluster study-mcp-cluster \
  --service-name study-mcp-backend \
  --desired-status STOPPED \
  --region us-east-1

# Get details of a stopped task
aws ecs describe-tasks \
  --cluster study-mcp-cluster \
  --tasks <TASK_ARN> \
  --region us-east-1
```

### Step 2: Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /ecs/study-mcp-backend --since 1h --region us-east-1

# Or in AWS Console:
# CloudWatch → Log groups → /ecs/study-mcp-backend
```

### Step 3: Common Issues

1. **Database connection failing**
   - Check `SUPABASE_URL` or `DATABASE_URL` in Secrets Manager
   - Verify the database is accessible from ECS

2. **Missing environment variables**
   - Check all secrets in Secrets Manager are set
   - Verify task definition has all required secrets

3. **Container crashing on startup**
   - Check logs for startup errors
   - Verify Docker image is correct

### Step 4: Restart the Service

Once you fix the issue, force a new deployment:

```bash
aws ecs update-service \
  --cluster study-mcp-cluster \
  --service study-mcp-backend \
  --force-new-deployment \
  --region us-east-1
```

Or via AWS Console:
1. ECS → Clusters → `study-mcp-cluster`
2. Services → `study-mcp-backend`
3. Update → Force new deployment → Update

## Quick Check Commands

```bash
# Check service status
aws ecs describe-services \
  --cluster study-mcp-cluster \
  --services study-mcp-backend \
  --region us-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

# Check if any tasks are running
aws ecs list-tasks \
  --cluster study-mcp-cluster \
  --service-name study-mcp-backend \
  --region us-east-1

# View logs
aws logs tail /ecs/study-mcp-backend --follow --region us-east-1
```
