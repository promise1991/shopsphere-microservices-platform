from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx

app = FastAPI(title="notification-service", description="Email/SMS notifications, async", version="1.0.0")
SERVICE_NAME = "notification-service"
PORT = int(os.getenv("PORT", 8008))

# In-memory DB for learning - real companies use Postgres/Redis
db = {}

@app.get("/")
def root():
    return {"service": SERVICE_NAME, "status": "running", "description": "Email/SMS notifications, async"}

@app.get("/health")
def health():
    return {"status": "healthy", "service": SERVICE_NAME}

@app.get("/api/notification")
def list_items():
    return {"service": SERVICE_NAME, "data": list(db.values())[:20], "count": len(db)}

class ItemIn(BaseModel):
    id: Optional[str] = None
    name: str
    data: Optional[dict] = None

@app.post("/api/notification")
def create_item(item: ItemIn):
    item_id = item.id or str(len(db)+1)
    db[item_id] = {"id": item_id, "name": item.name, "data": item.data, "service": SERVICE_NAME}
    return db[item_id]

@app.get("/api/notification/{item_id}")
def get_item(item_id: str):
    if item_id not in db:
        raise HTTPException(404, f"Not found in {SERVICE_NAME}")
    return db[item_id]

# Example inter-service call (how microservices talk)
@app.get("/api/notification/deps/check")
async def check_deps():
    results = {}
    deps = []
    async with httpx.AsyncClient(timeout=2) as client:
        for dep in deps:
            try:
                # In K8s, service name is DNS: http://<service-name>:<port>/health
                url = f"http://{dep}:8008/health"  # port will be replaced by logic
                # we use standard ports map
                port_map = {'api-gateway': 8000, 'auth-service': 8001, 'user-service': 8002, 'product-service': 8003, 'cart-service': 8004, 'order-service': 8005, 'payment-service': 8006, 'inventory-service': 8007, 'notification-service': 8008, 'search-service': 8009, 'review-service': 8010, 'analytics-service': 8011}
                real_port = port_map.get(dep, 8000)
                r = await client.get(f"http://{dep}:{real_port}/health")
                results[dep] = r.status_code
            except Exception as e:
                results[dep] = f"unreachable: {e}"
    return results
