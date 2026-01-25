# Fix and Deploy Your Backend

## The Problem

Your backend is **crashing on startup** with this error:
```
TypeError: supabase.from(...).select(...).eq(...).order(...).limit is not a function
```

This is because the Supabase query builder wasn't properly chaining methods. **I've fixed it** in the code.

## The Solution

You need to rebuild and redeploy your Docker image to ECS.

### Quick Deploy (Automated)

```bash
cd /Users/hamzaammar/Documents/Code/mcp-workspace/d2l-mcp
./scripts/deploy-to-ecs.sh
```

This script will:
1. Build the TypeScript code
2. Build the Docker image
3. Push to ECR
4. Force a new ECS deployment

### Manual Deploy (Step by Step)

```bash
cd /Users/hamzaammar/Documents/Code/mcp-workspace/d2l-mcp

# 1. Build TypeScript
npm run build

# 2. Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  051140201449.dkr.ecr.us-east-1.amazonaws.com

# 3. Build and push Docker image for linux/amd64 (required for ECS Fargate)
# Create buildx builder if needed
docker buildx create --use --name multiarch-builder 2>/dev/null || docker buildx use multiarch-builder

# Build directly for linux/amd64 and push to ECR
docker buildx build \
  --platform linux/amd64 \
  --tag 051140201449.dkr.ecr.us-east-1.amazonaws.com/study-mcp-backend:latest \
  --push \
  .

# 5. Force new deployment
aws ecs update-service \
  --cluster study-mcp-cluster \
  --service study-mcp-backend \
  --force-new-deployment \
  --region us-east-1
```

## Verify It's Working

After deployment (wait 1-2 minutes):

```bash
# Check service status
aws ecs describe-services \
  --cluster study-mcp-cluster \
  --services study-mcp-backend \
  --region us-east-1 \
  --query 'services[0].{Running:runningCount,Desired:desiredCount}'

# Should show: Running: 1, Desired: 1

# Test health endpoint
curl https://api.hamzaammar.ca/health
# Should return: {"ok":true}
```

## Watch the Deployment

```bash
# Watch logs in real-time
aws logs tail /ecs/study-mcp-backend --follow --region us-east-1

# Check service events
aws ecs describe-services \
  --cluster study-mcp-cluster \
  --services study-mcp-backend \
  --region us-east-1 \
  --query 'services[0].events[:5]'
```

## What Was Fixed

The Supabase query builder now properly chains methods:
- `.select()` → `.eq()` → `.order()` → `.limit()` ✅
- Previously: `.order()` was returning a promise instead of a builder ❌

This fix allows queries like:
```typescript
supabase
  .from("notes")
  .select("id, title")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(5)
```

To work correctly.
