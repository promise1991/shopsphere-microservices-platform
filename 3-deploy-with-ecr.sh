#!/bin/bash
set -e
ACCOUNT_ID=${1:-293160392232}  # i replaced ? with - so that it can run without args(USER ID and REGION) for testing
REGION=${2:-eu-north-1}
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
NAMESPACE="microservices"

echo "=== Deploying with Helm Umbrella using ECR images ==="

# Update helm dependencies
helm dependency update ./helm/platform

# Deploy using ECR registry
helm upgrade --install platform ./helm/platform   --namespace $NAMESPACE --create-namespace   --set global.imageRegistry=$REGISTRY   --set global.imageTag=latest   --set global.imagePullSecrets[0]=ecr-secret

echo ""
echo "Waiting for pods to pull from ECR..."
kubectl get pods -n $NAMESPACE -w
