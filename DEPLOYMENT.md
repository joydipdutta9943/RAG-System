# AWS Deployment Guide for Enhanced RAG System

This guide provides step-by-step instructions for deploying the Enhanced RAG System to AWS using Docker and ECS Fargate.

## Prerequisites

- AWS CLI installed and configured
- Docker installed
- MongoDB Atlas account (recommended for production)
- Google AI API key
- Domain name (optional)

## Quick Deploy (ECS Fargate)

### 1. Build and Push to ECR

```bash
# Set your AWS region and account ID
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Build Docker image
docker build -t rag-system .

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name rag-system --region $AWS_REGION || echo "Repository already exists"

# Tag and push image
docker tag rag-system:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rag-system:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rag-system:latest
```

### 2. Create ECS Resources

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name rag-system-cluster --region $AWS_REGION

# Create task definition
sed "s/\${AWS_ACCOUNT_ID}/$AWS_ACCOUNT_ID/g; s/\${AWS_REGION}/$AWS_REGION/g" .aws/ecs-task-definition-simplified.json > /tmp/task-definition.json
aws ecs register-task-definition --cli-input-json file:///tmp/task-definition.json --region $AWS_REGION
```

### 3. Set Up Secrets

Create secrets in AWS Secrets Manager:

```bash
# Database URL
aws secretsmanager create-secret --name rag-system/database-url --secret-string "mongodb+srv://user:password@cluster.mongodb.net/rag-prod"

# Redis URL
aws secretsmanager create-secret --name rag-system/redis-url --secret-string "redis://your-elasticache-cluster.cache.amazonaws.com:6379"

# JWT Secret
aws secretsmanager create-secret --name rag-system/jwt-secret --secret-string "your-super-secret-jwt-key"

# Google AI API Key
aws secretsmanager create-secret --name rag-system/google-ai-api-key --secret-string "your-google-ai-api-key"
```

### 4. Create ECS Service

```bash
# Get default VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region $AWS_REGION --query 'Vpcs[0].VpcId' --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --region $AWS_REGION --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')

# Create security group
SG_ID=$(aws ec2 create-security-group --group-name rag-system-sg --description "Security group for RAG System" --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $AWS_REGION

# Create service
aws ecs create-service \
  --cluster rag-system-cluster \
  --service-name rag-system-service \
  --task-definition rag-system \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region $AWS_REGION
```

## Local Development

### Using Docker Compose

```bash
# Development with MongoDB and Redis
docker-compose -f docker-compose.dev.yml up -d

# Production-like setup (external database)
docker-compose up -d
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Update with your configuration
3. For production, use `.env.production.example` as a template

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a free MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Store in AWS Secrets Manager

### Local MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Or use docker-compose.dev.yml
```

## Redis Setup

### ElastiCache (Recommended for Production)

1. Create ElastiCache Redis cluster
2. Get endpoint URL
3. Store in AWS Secrets Manager

### Local Redis

```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:7.2-alpine

# Or use docker-compose.dev.yml
```

## Monitoring and Logging

### CloudWatch Integration

The application is configured to send logs to CloudWatch Logs:

- Log Group: `/ecs/rag-system`
- Log Stream: `ecs/{service-name}`

### Health Check

The application includes a health check endpoint:
- URL: `/health`
- Method: GET
- Returns application status and dependencies

## Security Considerations

1. **Never commit secrets to Git** - Use AWS Secrets Manager
2. **Use VPC** - Deploy within a VPC for network isolation
3. **IAM Roles** - Use least-privilege IAM roles
4. **HTTPS** - Use Application Load Balancer with SSL
5. **Security Groups** - Restrict inbound/outbound traffic

## Environment Variables

### Required

- `DATABASE_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Strong secret for JWT signing
- `GOOGLE_AI_API_KEY` - Google AI API key

### Optional

- `NODE_ENV` - Environment (development/production)
- `PORT` - Application port (default: 3000)
- `MAX_FILE_SIZE` - Maximum file upload size (default: 50MB)
- `LOG_LEVEL` - Logging level (info/warn/error)

## Cost Optimization

- Use Fargate Spot instances for cost savings
- Auto-scale based on CPU/memory usage
- Use smaller instance sizes for development
- Monitor CloudWatch metrics for right-sizing

## Troubleshooting

### Common Issues

1. **Container won't start**: Check logs with `aws logs tail /ecs/rag-system --follow`
2. **Database connection**: Verify secrets and network connectivity
3. **Memory issues**: Increase task memory allocation
4. **OCR performance**: Consider larger instance sizes for image processing

### Debugging

```bash
# View ECS service events
aws ecs describe-services --cluster rag-system-cluster --services rag-system-service --region $AWS_REGION

# View task logs
aws logs get-log-events --log-group-name /ecs/rag-system --log-stream-prefix ecs --region $AWS_REGION

# SSH into task (if needed)
aws ecs execute-command --cluster rag-system-cluster --task <task-id> --container rag-api --command "/bin/sh" --interactive
```

## Scaling

### Horizontal Scaling

```bash
# Update desired count
aws ecs update-service --cluster rag-system-cluster --service rag-system-service --desired-count 3

# Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/rag-system-cluster/rag-system-service \
  --min-capacity 1 --max-capacity 10
```

### Vertical Scaling

Update task definition CPU and memory values:
- CPU: 256, 512, 1024, 2048, 4096 units
- Memory: 512, 1024, 2048, 4096, 8192, 16384 MB

## Backup and Recovery

### Database Backups

- MongoDB Atlas: Enable automatic backups
- Custom backups: Use MongoDB mongodump

### Redis Backups

- ElastiCache: Enable automatic backups
- Manual snapshots: Create via AWS Console

### Application Recovery

1. Deploy new ECS service with same task definition
2. Restore database from backup
3. Update secrets if needed
4. Test functionality

## Performance Optimization

1. **Use Application Load Balancer** for better performance
2. **Enable Redis clustering** for high availability
3. **Use CDN** for static assets
4. **Optimize Docker image size** with multi-stage builds
5. **Enable compression** in Express middleware

## Updates and Maintenance

### Zero-Downtime Deployment

```bash
# Create new task definition revision
aws ecs register-task-definition ...

# Update service with new task definition
aws ecs update-service --service rag-system-service --task-definition rag-system:new-revision

# Wait for deployment to complete
aws ecs wait services-stable --cluster rag-system-cluster --services rag-system-service
```

### Maintenance Windows

- Schedule deployments during low-traffic periods
- Use ECS deployment strategies (rolling/blue-green)
- Monitor health during deployment
- Have rollback plan ready