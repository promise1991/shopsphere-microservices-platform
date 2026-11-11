#!/bin/bash
set -e
echo "=== Minikube Microservices Deploy ==="
minikube status || minikube start --cpus=4 --memory=8192

echo "Updating helm dependencies (umbrella)"
helm dependency update ./helm/platform

echo "Installing / Upgrading platform"
helm upgrade --install platform ./helm/platform --set global.imageRegistry="" --create-namespace --namespace microservices

echo "Waiting for pods..."
kubectl get pods -n microservices -w
