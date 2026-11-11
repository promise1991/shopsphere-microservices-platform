import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, getOrders } from '../api';
export default function Home(){
  const [products,setProducts]=useState([]); const [orders,setOrders]=useState([]);
  useEffect(()=>{ getProducts().then(d=>setProducts(d.data||d||[])).catch(()=>{}); getOrders().then(d=>setOrders(d.data||d||[])).catch(()=>{}); },[]);
  return (<div>
    <h1>ShopSphere — Full Web App on Microservices</h1>
    <p>Frontend (React) → <b>api-gateway:8000</b> → 11 microservices → In-memory DB. Every card below is a live API call through the gateway.</p>
    <div className="kpi">
      <div><div>Products</div><b>{products.length}</b><div>via /api/product → product-service:8003</div></div>
      <div><div>Orders</div><b>{orders.length}</b><div>via /api/order → order-service:8005</div></div>
      <div><div>Services</div><b>12</b><div>api-gateway + 11 services</div></div>
      <div><div>Architecture</div><b>Polyglot</b><div>Python FastAPI • Node • React</div></div>
    </div>
    <div className="row">
      <Link className="btn btn-primary" to="/products">Browse Products →</Link>
      <Link className="btn btn-green" to="/orders">View Orders →</Link>
      <Link className="btn btn-ghost" to="/services">Check Services Health →</Link>
    </div>
    <h2 style={{marginTop:24}}>How it works</h2>
    <div className="card"><p><b>Browser → Frontend Pod (nginx)</b> → <b>api-gateway Service</b> → <b>product-service / cart-service / order-service</b> → each service talks to its dependencies via K8s Service DNS like <code>http://product-service:8003/health</code>. No IPs hardcoded.</p><p>Try: Add a product → Add to cart → Create order → Check Services Health to see all 12 services talking.</p></div>
  </div>);
}
