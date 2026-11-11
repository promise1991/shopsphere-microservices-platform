import React, { useEffect, useState } from 'react';
import axios from 'axios';
const SERVICES=[
  {name:'api-gateway',port:8000,desc:'Single entry point'},
  {name:'auth-service',port:8001,desc:'Login / Register'},
  {name:'user-service',port:8002,desc:'Users'},
  {name:'product-service',port:8003,desc:'Product catalog'},
  {name:'cart-service',port:8004,desc:'Shopping cart'},
  {name:'order-service',port:8005,desc:'Orders - depends on cart, inventory, payment'},
  {name:'payment-service',port:8006,desc:'Payments'},
  {name:'inventory-service',port:8007,desc:'Stock'},
  {name:'notification-service',port:8008,desc:'Notifications'},
  {name:'search-service',port:8009,desc:'Search'},
  {name:'review-service',port:8010,desc:'Reviews'},
  {name:'analytics-service',port:8011,desc:'Analytics'},
];
export default function Services(){
  const [status,setStatus]=useState({}); const [deps,setDeps]=useState(null);
  const checkAll=async()=>{
    const results={};
    for(const s of SERVICES){
      try{ const r=await axios.get(`/api/${s.name.replace('-service','').replace('api-gateway','')}/health`,{timeout:3000}).catch(()=>null);
        // Fallback: try via gateway generic health - gateway proxies /api/<service>
        const res=await fetch(`/api/order/deps/check`).then(r=>r.json()).catch(()=>null);
        results[s.name]= 'check';
      }catch{ results[s.name]='error'; }
    }
    // Simpler: use order deps + direct gateway health checks
    try{ const d=await fetch('/api/order/deps/check').then(r=>r.json()); setDeps(d); }catch{}
    // Check each via gateway health endpoint - most services expose /health at root via gateway
    const map={};
    for(const s of SERVICES){
      try{ const r=await fetch(`/api/${s.name}/health`).then(r=>r.json()).catch(()=>null); map[s.name]= r? '200 OK':'unknown'; }catch{ map[s.name]='unreachable'; }
    }
    setStatus(map);
  };
  useEffect(()=>{ checkAll(); },[]);
  return (<div><h2>Services Health <span className="pill">12 services • Live via K8s Services</span></h2>
    <button className="btn" onClick={checkAll}>Refresh Health</button>
    {deps && <div className="card" style={{marginTop:12}}><h3>order-service deps/check (live)</h3><pre>{JSON.stringify(deps,null,2)}</pre><p>This is the exact endpoint you tested with curl. 200 = that microservice answered via its K8s Service DNS.</p></div>}
    <table style={{marginTop:12}}><thead><tr><th>Service</th><th>Port</th><th>What it does</th><th>Status</th></tr></thead><tbody>
    {SERVICES.map(s=>(<tr key={s.name}><td><b>{s.name}</b></td><td>{s.port}</td><td>{s.desc}</td><td><span className="badge">{status[s.name]||'checking...'}</span></td></tr>))}
    </tbody></table>
    <p style={{marginTop:12}}>Note: In this demo, health is checked via api-gateway. In K8s, each Pod has its own livenessProbe hitting <code>/health</code> directly.</p>
  </div>);
}
