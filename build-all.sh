#!/bin/bash
set -e
echo "Building all 12 microservices for minikube..."
# Use minikube docker env so images are available inside minikube
eval $(minikube docker-env)

for svc in api-gateway auth-service user-service product-service cart-service order-service payment-service inventory-service notification-service search-service review-service analytics-service; do
  echo ">>> Building $svc"
  docker build -t $svc:latest ./services/$svc
done

echo "All images built inside minikube docker daemon"
docker images | grep -E "api-gateway|auth-service|user-service"
