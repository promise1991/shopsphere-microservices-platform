# PROD FLOW WITH ECR + MINIKUBE

This is how REAL companies do it, even when testing locally.

## The Flow (Same as Prod):

```
Your Code -> Docker Build -> docker push to ECR -> Kubernetes pulls from ECR -> Helm Deploys
```

NOT: `minikube docker-env` hack. That hack is ONLY for quick local testing. You asked for prod, so we do ECR.

### Why ECR tokens expire:
ECR password is valid 12 hours. In EKS, AWS handles it via IRSA (IAM Role for Service Account). In minikube, we manually create a Kubernetes Secret.

## Steps:

### 1. Build & Push to ECR (One Command)
```bash
./1-build-and-push-ecr.sh 123456789012 eu-west-1
```
What happens:
- docker build 12 services
- docker tag 123456789.dkr.ecr.../api-gateway:latest
- aws ecr create-repository (if needed)
- docker push to ECR

### 2. Tell Minikube how to pull from ECR
```bash
./2-setup-minikube-ecr-auth.sh 123456789012 eu-west-1
```
What happens:
- Gets ECR password: `aws ecr get-login-password`
- Creates K8s Secret: `kubectl create secret docker-registry ecr-secret`
- This secret is referenced in Deployment via `imagePullSecrets`

Without this, you will get `ImagePullBackOff` or `ErrImagePull` - because minikube cannot auth to ECR.

### 3. Deploy with Helm Umbrella using ECR
```bash
./3-deploy-with-ecr.sh 123456789012 eu-west-1
```
What happens:
- Helm installs 12 Deployments, but image is `123456789.dkr.ecr.eu-west-1.amazonaws.com/api-gateway:latest`
- K8s uses ecr-secret to pull
- Liveness probe checks /health

### Verify:
```bash
kubectl get pods -n microservices
kubectl get svc -n microservices
kubectl logs -f deployment/api-gateway -n microservices

# Port-forward gateway
kubectl port-forward svc/api-gateway 8000:8000 -n microservices
curl http://localhost:8000/
```

### Handling ECR 12h Expiry:
If after 12h pods start failing to pull (when you scale or restart), run step 2 again, or setup cron:

```bash
chmod +x ecr-credential-refresh-cron.sh
# Add to crontab: runs every 8 hours
(crontab -l 2>/dev/null; echo "0 */8 * * * $(pwd)/ecr-credential-refresh-cron.sh 123456789012 eu-west-1") | crontab -
```

### What Changes When You Move to EKS?
**NOTHING in your app code or Helm.**
- Same 12 Docker images in ECR
- Same `helm upgrade --install platform ./helm/platform --set global.imageRegistry=...`
- Only difference: In EKS, you don't need `ecr-secret` manual step. You attach IAM role via IRSA that allows EKS nodes to pull from ECR automatically.
- Also add ALB Ingress Controller for real domain.

So by using ECR now in minikube, you are already doing prod process.

### Common Errors:
1. `ImagePullBackOff` -> Run step 2 again, token expired
2. `no basic auth credentials` -> You forgot step 2
3. `helm dependency not found` -> Run `helm dependency update ./helm/platform`
4. WSL timeout again -> `wsl --shutdown` then `minikube start`
