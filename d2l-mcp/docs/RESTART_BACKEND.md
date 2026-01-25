# How to Restart Your Backend on AWS

## Option 1: If Running on EC2 (Most Likely)

Based on your sync scripts, you're likely running on EC2 at `3.93.185.101`.

### Quick Restart (if using PM2)

```bash
# SSH into your EC2 instance
ssh -i ~/.ssh/PokeIntegrations ec2-user@3.93.185.101

# Restart PM2 processes
pm2 restart all

# Or restart specific service
pm2 restart d2l-mcp
```

### Full Restart (rebuild and restart)

```bash
# SSH into EC2
ssh -i ~/.ssh/PokeIntegrations ec2-user@3.93.185.101

# Navigate to workspace
cd ~/mcp-workspace/d2l-mcp

# Rebuild (if code changed)
npm run build

# Restart with PM2
pm2 restart d2l-mcp

# Or if not using PM2, stop and start manually
# pkill -f "node.*index.js"
# MCP_TRANSPORT=http npm start &
```

### Check Status

```bash
# Check if running
pm2 status

# Check logs
pm2 logs d2l-mcp

# Check if port 3000 is listening
netstat -tlnp | grep 3000
# or
ss -tlnp | grep 3000
```

## Option 2: If Running on ECS Fargate

### Via AWS Console

1. Go to **ECS** → **Clusters** → Your cluster
2. Click on **Services** tab
3. Select your service (e.g., `study-mcp-backend`)
4. Click **Update**
5. Check **Force new deployment**
6. Click **Update**

This will create new tasks with the latest code and gracefully replace old ones.

### Via AWS CLI

```bash
# Force new deployment (restarts all tasks)
aws ecs update-service \
  --cluster study-mcp-cluster \
  --service study-mcp-backend \
  --force-new-deployment \
  --region us-east-1

# Check service status
aws ecs describe-services \
  --cluster study-mcp-cluster \
  --services study-mcp-backend \
  --region us-east-1
```

### Restart Specific Task

```bash
# List running tasks
aws ecs list-tasks \
  --cluster study-mcp-cluster \
  --service-name study-mcp-backend \
  --region us-east-1

# Stop a specific task (will be replaced automatically)
aws ecs stop-task \
  --cluster study-mcp-cluster \
  --task <TASK_ID> \
  --region us-east-1
```

## Option 3: If Using Docker Directly on EC2

```bash
# SSH into EC2
ssh -i ~/.ssh/PokeIntegrations ec2-user@3.93.185.101

# Stop container
docker stop study-mcp-backend
# or
docker-compose down

# Rebuild (if code changed)
docker-compose build

# Start again
docker-compose up -d
# or
docker start study-mcp-backend
```

## After Restarting

1. **Check health endpoint:**
   ```bash
   curl https://api.hamzaammar.ca/health
   # Should return: {"ok":true}
   ```

2. **Check logs for errors:**
   - EC2: `pm2 logs` or check CloudWatch Logs
   - ECS: CloudWatch Logs → `/ecs/study-mcp-backend`

3. **Test dashboard endpoint:**
   ```bash
   curl https://api.hamzaammar.ca/api/dashboard \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Quick Check: Which Deployment Method?

To determine which method you're using:

```bash
# Check if PM2 is running
ssh -i ~/.ssh/PokeIntegrations ec2-user@3.93.185.101 "pm2 status"

# Check if ECS service exists
aws ecs list-services --cluster study-mcp-cluster --region us-east-1

# Check if Docker container is running
ssh -i ~/.ssh/PokeIntegrations ec2-user@3.93.185.101 "docker ps | grep mcp"
```

## Common Issues After Restart

1. **503 Service Unavailable** - Database connection issue
   - Check `SUPABASE_URL` or `DATABASE_URL` env var
   - Verify database is accessible from EC2/ECS

2. **502 Bad Gateway** - Service not responding
   - Check if process is actually running
   - Check logs for startup errors
   - Verify port 3000 is listening

3. **Health check failing** - Service not ready
   - Wait 30-60 seconds after restart
   - Check application logs for errors
