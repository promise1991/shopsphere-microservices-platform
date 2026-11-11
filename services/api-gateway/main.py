
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import httpx, os

app = FastAPI(title="api-gateway", description="Entry point for all microservices")

SERVICE_MAP = {
    "auth": "http://auth-service:8001",
    "users": "http://user-service:8002",
    "products": "http://product-service:8003",
    "cart": "http://cart-service:8004",
    "orders": "http://order-service:8005",
    "payments": "http://payment-service:8006",
    "inventory": "http://inventory-service:8007",
    "notifications": "http://notification-service:8008",
    "search": "http://search-service:8009",
    "reviews": "http://review-service:8010",
    "analytics": "http://analytics-service:8011",
}

@app.get("/")
def root():
    return {"gateway": "running", "routes": list(SERVICE_MAP.keys()), "try": "/api/products, /api/users etc"}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "api-gateway"}

@app.api_route("/api/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def proxy(path: str, request: Request):
    # Simple path routing: /api/products -> product-service
    first = path.split("/")[0] if path else ""
    mapping = {"auth":"auth","users":"user","products":"product","cart":"cart","orders":"order","payments":"payment","inventory":"inventory","notifications":"notification","search":"search","reviews":"review","analytics":"analytics"}
    # fallback direct
    target_base = None
    for key, svc_prefix in mapping.items():
        if first.startswith(key) or first.startswith(svc_prefix):
            # find service containing svc_prefix
            for svc_name, url in SERVICE_MAP.items():
                if svc_prefix in svc_name:
                    target_base = url
                    break
    if not target_base:
        # try direct key
        if first in SERVICE_MAP:
            target_base = SERVICE_MAP[first]
        else:
            raise HTTPException(404, f"No service for path {path}")

    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.request(request.method, f"{target_base}/api/{path}", content=body, headers=headers, params=dict(request.query_params))
            return JSONResponse(content=resp.json() if "application/json" in resp.headers.get("content-type","") else {"raw": resp.text}, status_code=resp.status_code)
        except Exception as e:
            return JSONResponse({"error": str(e), "target": target_base}, status_code=502)
