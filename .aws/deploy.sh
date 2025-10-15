#!/bin/bash

# AWS Deployment Script for RAG System
# This script deploys the RAG System to AWS ECS using Fargate

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY_NAME="rag-system"
ECS_CLUSTER_NAME="rag-system-cluster"
ECS_SERVICE_NAME="rag-system-service"
ECS_TASK_FAMILY="rag-system"

echo "🚀 Starting AWS deployment for RAG System..."
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Build and push Docker image to ECR
echo "📦 Building Docker image..."
docker build -t $ECR_REPOSITORY_NAME .

# Get ECR authentication token
echo "🔐 Authenticating with ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository if it doesn't exist
echo "📋 Setting up ECR repository..."
if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION &> /dev/null; then
    echo "Creating ECR repository: $ECR_REPOSITORY_NAME"
    aws ecr create-repository --repository-name $ECR_REPOSITORY_NAME --region $AWS_REGION
fi

# Tag and push image to ECR
ECR_IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:latest"
echo "🏷️  Tagging image: $ECR_IMAGE_URI"
docker tag $ECR_REPOSITORY_NAME:latest $ECR_IMAGE_URI

echo "📤 Pushing image to ECR..."
docker push $ECR_IMAGE_URI

# Create ECS cluster if it doesn't exist
echo "🏗️  Setting up ECS cluster..."
if ! aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $AWS_REGION | jq '.clusters[0].status' | grep -q "ACTIVE"; then
    echo "Creating ECS cluster: $ECS_CLUSTER_NAME"
    aws ecs create-cluster --cluster-name $ECS_CLUSTER_NAME --region $AWS_REGION
fi

# Create VPC and security group if they don't exist (simplified for demo)
echo "🌐 Setting up networking..."
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region $AWS_REGION --query 'Vpcs[0].VpcId' --output text)

# Create security group
SG_ID=$(aws ec2 create-security-group --group-name rag-system-sg --description "Security group for RAG System" --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text)
echo "Created security group: $SG_ID"

# Allow inbound HTTP traffic
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $AWS_REGION

# Create subnets (simplified)
SUBNET_IDS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --region $AWS_REGION --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')

# Update ECS task definition
echo "📝 Registering ECS task definition..."
sed "s/\${AWS_ACCOUNT_ID}/$AWS_ACCOUNT_ID/g; s/\${AWS_REGION}/$AWS_REGION/g" .aws/ecs-task-definition.json > /tmp/ecs-task-definition-updated.json

TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file:///tmp/ecs-task-definition-updated.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
echo "Registered task definition: $TASK_DEF_ARN"

# Create or update ECS service
echo "🚢 Creating/updating ECS service..."
if aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION | jq '.services[0].status' | grep -q "ACTIVE"; then
    echo "Updating existing ECS service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER_NAME \
        --service $ECS_SERVICE_NAME \
        --task-definition $TASK_DEF_ARN \
        --force-new-deployment \
        --region $AWS_REGION
else
    echo "Creating new ECS service..."
    aws ecs create-service \
        --cluster $ECS_CLUSTER_NAME \
        --service-name $ECS_SERVICE_NAME \
        --task-definition $TASK_DEF_ARN \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
fi

echo "⏳ Waiting for service to stabilize..."
aws ecs wait services-stable --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION

# Get the public IP of the running task
echo "🌍 Getting deployment details..."
TASK_ARN=$(aws ecs list-tasks --cluster $ECS_CLUSTER_NAME --service-name $ECS_SERVICE_NAME --region $AWS_REGION --query 'taskArns[0]' --output text)

if [ "$TASK_ARN" != "None" ]; then
    NETWORK_INTERFACE_ID=$(aws ecs describe-tasks --cluster $ECS_CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
    PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $NETWORK_INTERFACE_ID --region $AWS_REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)

    echo "✅ Deployment completed successfully!"
    echo "🌐 Your RAG System is running at: http://$PUBLIC_IP:3000"
    echo "🏥 Health check: http://$PUBLIC_IP:3000/health"
else
    echo "⚠️  Service is starting up. Please check the AWS ECS console for status."
fi

echo "🎉 Deployment finished!"
echo "📋 Next steps:"
echo "   1. Configure your secrets in AWS Secrets Manager"
echo "   2. Set up your database (MongoDB Atlas recommended)"
echo "   3. Set up your Redis instance (ElastiCache recommended)"
echo "   4. Configure your load balancer and domain name"