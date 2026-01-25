# How to Restart Your Backend

## Your Setup

Your backend is running on **ECS Fargate** behind an **Application Load Balancer (ALB)**.

- **Domain**: `api.hamzaammar.ca` (points to ALB)
- **ECS Cluster**: `study-mcp-cluster` (likely)
- **ECS Service**: `study-mcp-backend` (likely)
- **Task Definition**: `study-mcp-backend`
- **Container Image**: `051140201449.dkr.ecr.us-east-1.amazonaws.com/study-mcp-backend:latest`

## Quick Restart (Force New Deployment)

### Option 1: AWS Console (Easiest)

1. Go to **AWS Console** → **ECS**
2. Click **Clusters** → Find your cluster (probably `study-mcp-cluster`)
3. Click on the cluster
4. Click **Services** tab
5. Find your service (probably `study-mcp-backend`)
6. Click on the service
7. Click **Update**
8. Check the box: **Force new deployment**
9. Click **Update**

This will:
- Create new tasks with the latest code
- Gracefully replace old tasks
- Keep your service running during the update

### Option 2: AWS CLI

```bash
# Force new deployment (restarts all tasks)
aws ecs update-service \
  --cluster study-mcp-cluster \
  --service study-mcp-backend \
  --force-new-deployment \
  --region us-east-1

# Watch the deployment
aws ecs describe-services \
  --cluster study-mcp-cluster \
  --services study-mcp-backend \
  --region us-east-1 \
  --query 'services[0].deployments'
```

## If You Made Code Changes

If you've updated the code (like the Supabase fixes), you need to:

1. **Build and push new Docker image:**
   ```bash
   cd /Users/hamzaammar/Documents/Code/mcp-workspace/d2l-mcp
   
   # Build the code
   npm run build
   
   # Build Docker image
   docker build -t study-mcp-backend .
   
   # Tag for ECR
   docker tag study-mcp-backend:latest \
     051140201449.dkr.ecr.us-east-1.amazonaws.com/study-mcp-backend:latest
   
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     051140201449.dkr.ecr.us-east-1.amazonaws.com
   
   # Push to ECR
   docker push 051140201449.dkr.ecr.us-east-1.amazonaws.com/study-mcp-backend:latest
   ```

2. **Then force new deployment** (Option 1 or 2 above)

## Check Status

```bash
# Check service status
aws ecs describe-services \
  --cluster study-mcp-cluster \
  --services study-mcp-backend \
  --region us-east-1

# Check running tasks
aws ecs list-tasks \
  --cluster study-mcp-cluster \
  --service-name study-mcp-backend \
  --region us-east-1

# View logs (CloudWatch)
aws logs tail /ecs/study-mcp-backend --follow --region us-east-1
```

## Verify It's Working

After restarting, wait 30-60 seconds, then:

```bash
# Test health endpoint
curl https://api.hamzaammar.ca/health
# Should return: {"ok":true}

# Test dashboard (with auth token)
curl https://api.hamzaammar.ca/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### If tasks keep failing:
1. Check CloudWatch Logs: `/ecs/study-mcp-backend`
2. Look for database connection errors
3. Verify secrets in Secrets Manager are correct

### If 503 errors persist:
- Check if tasks are running: `aws ecs list-tasks --cluster study-mcp-cluster --service-name study-mcp-backend`
- Check task logs in CloudWatch
- Verify database connectivity from ECS tasks
