import React, { useEffect, useState } from 'react';
import { getOrders, createOrder } from '../api';
export default function Orders(){
  const [orders,setOrders]=useState([]); const [name,setName]=useState(''); const [msg,setMsg]=useState('');
  const load=()=>getOrders().then(d=>setOrders(d.data||d||[])).catch(e=>setMsg('Failed: '+e.message));
  useEffect(()=>{load()},[]);
  const create=async(e)=>{e.preventDefault(); try{ await createOrder({name, data:{qty:1}}); setMsg('✅ Order created via order-service → checks cart, inventory, payment'); setName(''); load(); }catch(err){ setMsg('❌ '+err.message)} };
  return (<div><h2>Orders <span className="pill">order-service:8005 via gateway</span></h2><p>{msg}</p>
    <form onSubmit={create} className="card" style={{maxWidth:520}}><h3>Create Order</h3><input placeholder="Order name e.g. Order for Nike Shoe" value={name} onChange={e=>setName(e.target.value)} required/><button className="btn btn-green" type="submit">Create Order</button></form>
    <table style={{marginTop:16}}><thead><tr><th>ID</th><th>Name</th><th>Service</th><th>Data</th></tr></thead><tbody>
    {orders.map((o,i)=>(<tr key={o.id||i}><td>{o.id}</td><td>{o.name}</td><td>{o.service||'order-service'}</td><td><code>{JSON.stringify(o.data)}</code></td></tr>))}
    {orders.length===0 && <tr><td colSpan="4">No orders yet.</td></tr>}
    </tbody></table>
    <div className="card" style={{marginTop:12}}><b>What happens when you create an order?</b><p>Frontend → api-gateway → order-service → it calls <code>cart-service:8004</code>, <code>inventory-service:8007</code>, <code>payment-service:8006</code> via K8s Service DNS. Check Services Health to see the 200s.</p></div>
  </div>);
}
