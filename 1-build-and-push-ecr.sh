#!/bin/bash
set -e
# PROD FLOW: Build -> Tag -> Push to ECR
# Usage: ./1-build-and-push-ecr.sh 123456789012 eu-west-1

ACCOUNT_ID=${1:?ERROR: Provide AWS Account ID -> ./1-build-and-push-ecr.sh 293160392232 eu-north-1}
REGION=${2:-eu-north-1}
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "=== STEP 1: ECR LOGIN ==="
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REGISTRY

echo "=== STEP 2: BUILD & PUSH 12 SERVICES ==="
for svc in api-gateway auth-service user-service product-service cart-service order-service payment-service inventory-service notification-service search-service review-service analytics-service; do
  echo ""
  echo ">>> Building $svc:v1"
  docker build -t $svc:v1 ./services/$svc
  
  echo ">>> Tagging $svc for ECR"
  docker tag $svc:v1 $REGISTRY/$svc:v1
  
  echo ">>> Creating ECR repo if not exists"
  aws ecr describe-repositories --repository-names $svc --region $REGION 2>&1 >/dev/null ||   aws ecr create-repository --repository-name $svc --region $REGION --image-scanning-configuration scanOnPush=true

  echo ">>> Pushing $REGISTRY/$svc:v1"
  docker push $REGISTRY/$svc:v1
done

echo ""
echo "=== DONE ==="
echo "All 12 images pushed to: $REGISTRY"
# echo "Next: Run ./2-setup-minikube-ecr-auth.sh $ACCOUNT_ID $REGION" I commented this out because I want to run the setup script without args for testing. The script has been modified to use default values if no args are provided.
