#!/bin/bash
set -e
# Usage: ./push-to-ecr.sh 123456789012 eu-west-1
ACCOUNT_ID=${1:?Provide AWS Account ID}
REGION=${2:-us-east-1}

echo "Logging into ECR $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

for svc in api-gateway auth-service user-service product-service cart-service order-service payment-service inventory-service notification-service search-service review-service analytics-service; do
  echo ">>> Tag & Push $svc"
  # create repo if not exists
  aws ecr describe-repositories --repository-names $svc --region $REGION 2>&1 || aws ecr create-repository --repository-name $svc --region $REGION
  docker tag $svc:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$svc:latest
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$svc:latest
done
