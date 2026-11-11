# ShopSphere — Microservices Platform on Kubernetes (ECR + Helm)

A full e-commerce web app built as **13 microservices** — 12 backend services + React frontend — deployed on Kubernetes with Helm and Amazon ECR.

Live flow: **Frontend (React + nginx) → API Gateway → Product / Cart / Order / Payment / User / Auth / Inventory / Search / Review / Notification / Analytics**

> This project started as a minikube learning lab and grew into a prod-style ECR + Helm deployment. Everything below is what we actually built, broke, debugged and fixed.

---

## What you get - 13 services

| # | Service | Port | What it does |
|---|---------|------|--------------|
| 1 | frontend | 80 | React ShopSphere UI - Products, Cart, Orders |
| 2 | api-gateway | 8000 | Front door. All outside traffic comes here. Like Kong / AWS API Gateway |
| 3 | auth-service | 8001 | Login / register / JWT. Like Auth0 / Cognito |
| 4 | user-service | 8002 | User profiles |
| 5 | product-service | 8003 | Product catalog. Like in Amazon / Shopify |
| 6 | cart-service | 8004 | Shopping cart |
| 7 | order-service | 8005 | Orders. Calls payment + inventory, reports unreachable instead of crashing |
| 8 | payment-service | 8006 | Mock Stripe / PayPal |
| 9 | inventory-service | 8007 | Stock management |
| 10 | notification-service | 8008 | Emails / SMS (async workers) |
| 11 | search-service | 8009 | Search (real companies use Elasticsearch) |
| 12 | review-service | 8010 | Ratings |
| 13 | analytics-service | 8011 | Event tracking |

**How they talk:** Inside Kubernetes, DNS works: `http://product-service:8003/health` reaches product service. No hardcoded IPs. Frontend talks to gateway via nginx `proxy_pass` + `$request_uri`.

---

## Architecture

```
[Browser localhost:3000]
  -> [frontend:80 nginx]
    -> [api-gateway:8000]
      -> [auth, product, cart, order, payment, user, inventory, search, review, notification, analytics]
                        |
        [order-service] -> calls [payment-service] + [inventory-service]
```

This is **synchronous HTTP**. Real companies also use async with RabbitMQ / Kafka, but we keep it simple for learning.

---

## Flow to understand deployment

### STEP 0: Prerequisites (WSL Ubuntu-22.04)

```bash
sudo apt update
sudo apt install docker.io -y
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
minikube start --cpus=4 --memory=8192 --driver=docker
kubectl get nodes
```

### STEP 1: Build (local minikube, no ECR yet)

```bash
chmod +x build-all.sh
./build-all.sh
```

What this does: `eval $(minikube docker-env)` points your docker to minikube's internal docker. So images you build are visible to Kubernetes without pushing.

### STEP 2: Deploy with Helm Umbrella

Umbrella = one chart that deploys all 13 as dependencies. This is how real teams do it.

```bash
helm dependency update ./helm/platform
helm upgrade --install platform ./helm/platform -n microservices --create-namespace
kubectl get pods -n microservices
kubectl get svc -n microservices
```

Test gateway direct (bypass frontend):

```bash
kubectl port-forward svc/api-gateway 8000:8000 -n microservices
curl http://localhost:8000/
curl http://localhost:8000/api/product
```

Test via frontend (full web app):

```bash
kubectl port-forward svc/frontend-service 3000:80 -n microservices
# Open http://localhost:3000
curl http://localhost:3000/api/product
```

### STEP 3: Push to ECR (for EKS / Prod)

Single region only: `eu-north-1` — Account `293160392232`
Old account `842746302640` was closed after credits ran out. All new work is in the new account, one region only.

```bash
# Create repo if missing (frontend was deleted once, this fixes it)
aws ecr create-repository --repository-name frontend --region eu-north-1

# Build + push example: frontend v4
docker build --no-cache -t frontend:v4 ./Frontend
docker tag frontend:v4 293160392232.dkr.ecr.eu-north-1.amazonaws.com/frontend:v4
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 293160392232.dkr.ecr.eu-north-1.amazonaws.com
docker push 293160392232.dkr.ecr.eu-north-1.amazonaws.com/frontend:v4
```

Then in helm values, set:

```yaml
global:
  imageRegistry: 293160392232.dkr.ecr.eu-north-1.amazonaws.com
```

And helm upgrade again:

```bash
helm dependency update ./helm/platform
helm upgrade --install platform ./helm/platform -n microservices --set frontend.image.repository=293160392232.dkr.ecr.eu-north-1.amazonaws.com/frontend --set frontend.image.tag=v4
kubectl get pods -n microservices -w
```

We use versioned tags like `v1`, `v4` — not `latest` — so rollbacks are clear.

### STEP 4: Scale / Understand

```bash
kubectl scale deployment product-service --replicas=3 -n microservices
kubectl logs -f deployment/api-gateway -n microservices
kubectl logs -l app=api-gateway -n microservices --tail=20
```

---

## Important Kubernetes Concepts

1. **Pod**: One running container of a service.
2. **Deployment**: Ensures X replicas of a Pod are always running, restarts if crashes.
3. **Service**: Stable DNS name + internal load balancer for a Deployment. `product-service` DNS. This is different from a microservice — a microservice is your code, a K8s Service is the stable network name for it.
4. **Helm**: Package manager for K8s. Like npm but for deployments. Umbrella chart = one command deploys whole platform.
5. **Namespace**: `microservices` isolates your apps from kube-system.
6. **Liveness/Readiness**: K8s pings /health to know if service is alive. Business endpoints like `/api/product` are different from `/health`.
7. **ReplicaSet**: When you upgrade with a bad image, old ReplicaSet keeps old pods Running while new one fails — that's why you see duplicates.
8. **ClusterIP**: Internal-only Service. Frontend reaches backend via ClusterIP + kube-dns, not via NodePort / EC2 IP.

---

## Demo - What Actually Worked

- Frontend: ShopSphere Products page at `http://localhost:3000`
- Create product in UI: Name `Nike Shoe`, Price `150` → appears in Products list
- Products tested:
  - ID 1 — Nike — $20000000 (created via gateway direct curl)
  - ID 2 — Blue Tshirt — $50000 (created via UI)
- Verified: `curl http://localhost:3000/api/product` returns product-service data via frontend + gateway
- Verified: `curl -X POST http://localhost:8000/api/product -H "Content-Type: application/json" -d '{"name":"Nike","data":{"price":20000000}}'` returns `{"id":"1","name":"Nike",...,"service":"product-service"}`
- Verified: product-service health returns `{"service":"product-service","status":"running","description":"Product catalog CRUD"}`

### Frontend nginx fix that made it work

`Frontend/nginx.conf`:

```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
  location /api/ {
    resolver 10.96.0.10 valid=30s;
    set $upstream api-gateway.microservices.svc.cluster.local:8000;
    proxy_pass http://$upstream$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Key line: `proxy_pass http://$upstream$request_uri;` — passes the full original `/api/product` to gateway.

---

## Everything We Debugged - Full War Story

### 1. 502 Bad Gateway — frontend could not reach gateway
**Symptom:** Browser showed 502, frontend pod Running but API calls failed.
**Cause:** nginx `proxy_pass` used wrong DNS / short name that did not resolve inside cluster.
**Fix:** Use FQDN `api-gateway.microservices.svc.cluster.local:8000` + `resolver 10.96.0.10 valid=30s;`
**Lesson:** In K8s, use full Service DNS, not EC2 IP or localhost. Internal ALB / EC2 IP trick from old traditional deploy does not apply.

### 2. 404 `{"detail":"No service for path "}` — empty path
**Symptom:** 502 gone, but Products page showed `Request failed with status code 404`. Direct gateway curl worked: `curl http://localhost:8000/api/product` returned data. Via frontend: `curl http://localhost:3000/api/product` returned `{"detail":"No service for path "}` — note empty path.
**Cause:** nginx variable in `proxy_pass` strips URI. When you use a variable, nginx does NOT auto-append original URI like it does without variable. So `/api/product` arrived at gateway as empty.
**Fix:** `proxy_pass http://$upstream$request_uri;`
**Lesson:** Always check what gateway actually received: `kubectl logs -l app=api-gateway -n microservices --tail=20`. Test both hops: gateway direct (8000) vs frontend nginx (3000).

### 3. ECR `name unknown: repository does not exist`
**Symptom:**
```
name unknown: The repository with name 'frontend' does not exist in the registry with id '293160392232'
```
**Cause:** All ECR repos were deleted to stop cost. The 12 backend repos were recreated, but `frontend` was never recreated. `aws ecr describe-repositories --region eu-north-1` showed 12 repos, no frontend.
**Fix:**
```bash
aws ecr create-repository --repository-name frontend --region eu-north-1
docker push 293160392232.dkr.ecr.eu-north-1.amazonaws.com/frontend:v4
```
**Lesson:** If CLI default region is `us-east-1` and you run create without `--region eu-north-1`, it creates in the wrong region. Always pass `--region eu-north-1`.

### 4. InvalidImageName duplicates
**Symptom:** `kubectl get pods -n microservices` showed 2 pods per service — one `1/1 Running`, one `0/1 InvalidImageName`.
**Cause:** Bad Helm upgrade with double-prefix image name (`293.../293.../service:v1`) created a new failing ReplicaSet. K8s kept old good ReplicaSet running so app did not go down.
**Fix:** Clean failing ReplicaSets:
```bash
kubectl delete replicaset -n microservices $(kubectl get rs -n microservices -o jsonpath='{.items[?(@.status.readyReplicas==0)].metadata.name}')
```
**Lesson:** Duplicates are not a bug — they are K8s rollback protection. Also: typo `microcservices` vs `microservices` returns `No resources found` — always check namespace spelling.

### 5. ImagePullBackOff — frontend v4
**Symptom:** `frontend-xxx 0/1 ImagePullBackOff`, old frontend `1/1 Running 24h` still serving old v3.
**Cause:** v4 tried to pull before `frontend` repo existed. Browser kept hitting old v3 with empty-path bug.
**Fix:** Create repo, push v4, then:
```bash
kubectl rollout restart deployment/frontend -n microservices
kubectl get pods -n microservices -w
```
**Lesson:** New pod must be `Running` with fresh age, not 24h old. Old pod = old code.

### 6. Double-prefix image name
**Symptom:** Image name like `293...dkr.ecr.eu-north-1.amazonaws.com/293...dkr.ecr.../frontend:v4`
**Cause:** Build script prepended registry twice — once in `imageRegistry` and once in tag.
**Fix:** Use one registry prefix only, use versioned tags `v1`, `v4`.

### 7. Docker / WSL / Zone.Identifier + port mapping
- `Zone.Identifier` files from Windows downloads break Docker build context — remove them.
- `analytics-service` needed `8011:8011` port mapping, not wrong host port, to answer `/health`.
- Order-service: if `payment-service` is down, order-service keeps running and reports `unreachable` — it does not crash. That is graceful failure, by design. Same for cart-service: `/health` should still answer even if deps are down.
- Product-service port is 8003, inter-service calls use `port_map` / Service DNS + port.

### 8. AWS Credits / Account
- Old account `842746302640`: credits fell $50 → $7.61 → $7 → $8 → $7, support case opened, account later closed.
- New account `293160392232` (user `promise-admin`): started $120 remaining, $0 used. After Explore AWS activities (EC2, Lambda, Bedrock, Budgets, RDS) credits became $200.00, 182 days to May 09, 2027.
- EC2 / RDS checked after activities: empty, $0.00.
- Lambda / Bedrock Nova Micro idle do not eat money if not invoked.
- Phone verification SMS never arrived (+234...), contact info updated, address 2 Matthew Ojo Street.
- Cost rule for this project: **eu-north-1 only, no multi-region**.

---

## Cost Safety

- Single region only: `eu-north-1`
- No running EC2 / RDS left behind — verify with Cost Explorer / console
- ECR only for images used
- Delete all ECR repos when done (destroys images, pods keep running until restart):

```bash
for repo in $(aws ecr describe-repositories --region eu-north-1 --query "repositories[].repositoryName" --output text); do
  echo "Deleting $repo..."
  aws ecr delete-repository --repository-name "$repo" --force --region eu-north-1
done
aws ecr describe-repositories --region eu-north-1 --query "repositories[].repositoryName" --output table
```

> Warning: After deleting ECR, any `helm upgrade` / `rollout restart` will fail with `ImagePullBackOff` until you push again. Keep local `docker images` + GitHub code as backup.

---

## Next Steps to EKS

- Same Docker images (from ECR)
- Same Helm chart — just `helm install` on EKS cluster instead of minikube
- Add Ingress (ALB), RDS, etc later. But flow is identical.

## Troubleshooting WSL

If you see WSL timeouts again, always do `wsl --shutdown` then `minikube start`.

## Troubleshooting Checklist

```bash
# 1. Pods?
kubectl get pods -n microservices

# 2. Frontend version?
kubectl get deployment frontend -n microservices -o jsonpath='{.spec.template.spec.containers[0].image}'

# 3. Gateway logs — what path did it receive?
kubectl logs -l app=api-gateway -n microservices --tail=20

# 4. Gateway direct vs frontend?
curl http://localhost:8000/api/product   # gateway direct
curl http://localhost:3000/api/product   # via frontend nginx

# 5. ECR repos in eu-north-1?
aws ecr describe-repositories --region eu-north-1 --query "repositories[].repositoryName" --output table
```

---

Built by learning-by-doing. Teacher mode: I drove the commands, fixed the bugs, and documented them here.
