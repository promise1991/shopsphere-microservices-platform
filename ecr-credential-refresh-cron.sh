#!/bin/bash
# Because ECR tokens expire every 12h, in real prod you need auto-refresh
# This cron job is a simple hack for minikube learning. In EKS you would use IRSA.

# Add to crontab: crontab -e
# 0 */8 * * * /path/to/ecr-credential-refresh-cron.sh 123456789012 eu-west-1

ACCOUNT_ID=$1
REGION=${2:-us-east-1}
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
NAMESPACE="microservices"

ECR_PASSWORD=$(aws ecr get-login-password --region $REGION)
kubectl delete secret ecr-secret -n $NAMESPACE 2>/dev/null || true
kubectl create secret docker-registry ecr-secret   --docker-server=$REGISTRY   --docker-username=AWS   --docker-password=$ECR_PASSWORD   --docker-email=no@email.com   -n $NAMESPACE

echo "[$(date)] ECR secret refreshed"
