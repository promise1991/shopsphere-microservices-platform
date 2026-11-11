#!/bin/bash
set -e
# Makes minikube able to PULL from ECR (prod process)


ACCOUNT_ID=${1:-293160392232}  # i replaced ? with - so that it can run without args(USER ID and REGION) for testing
REGION=${2:-eu-north-1}
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
NAMESPACE="microservices"

echo "=== Setting up Minikube to pull from ECR ==="
echo "Registry: $REGISTRY"

# Ensure minikube is running
minikube status || minikube start --cpus=4 --memory=8192 --driver=docker

# Create namespace if not exists
kubectl create namespace $NAMESPACE 2>/dev/null || true

# Method 1: Create ECR secret (lasts 12h) - PROD companies use ECR credential helper or IRSA, but for learning secret is fine
echo "Creating docker-registry secret 'ecr-secret'..."
# Delete old secret if there is any in the namespace to avoid conflicts
kubectl delete secret ecr-secret -n $NAMESPACE 2>/dev/null || true

# ECR password expires every 12 hours - this is why prod uses helpers
ECR_PASSWORD=$(aws ecr get-login-password --region $REGION)

kubectl create secret docker-registry ecr-secret   --docker-server=$REGISTRY   --docker-username=AWS   --docker-password=$ECR_PASSWORD   --docker-email=no@email.com   -n $NAMESPACE

echo "Secret created. It will expire in 12h."
echo "For auto-refresh in prod, install: https://github.com/upmc-enterprises/registry-creds or use EKS IRSA"

# Test pull
echo ""
echo "Testing pull from ECR..."
docker pull $REGISTRY/api-gateway:v1 || true

echo ""
echo "Next: Run ./3-deploy-with-ecr.sh $ACCOUNT_ID $REGION"
