import React, { useEffect, useState } from 'react';
import { getCart, createOrder } from '../api';
export default function Cart(){
  const [items,setItems]=useState([]); const [msg,setMsg]=useState('');
  const load=()=>getCart().then(d=>setItems(d.data||d||[])).catch(()=>setMsg('Cart is empty or cart-service not reachable'));
  useEffect(()=>{load()},[]);
  const checkout=async()=>{ try{ const order=await createOrder({name:'Order from Cart', data:{items, total: items.length}}); setMsg('✅ Order created! Order-service talked to cart + inventory + payment. Check Orders page.'); }catch(e){ setMsg('Checkout failed: '+e.message)} };
  return (<div><h2>Cart <span className="pill">cart-service:8004 via gateway</span></h2><p>{msg}</p>
    <button className="btn btn-ghost" onClick={load}>Refresh Cart</button>
    <div style={{marginTop:12}}>{items.length===0?<div className="card">Cart empty. Go to Products → Add to Cart.</div>: items.map((c,i)=>(<div key={i} className="card"><b>{c.name}</b> <span className="pill">ID {c.id}</span><pre>{JSON.stringify(c.data,null,2)}</pre></div>))}</div>
    {items.length>0 && <button className="btn btn-green" style={{marginTop:12}} onClick={checkout}>Checkout → Create Order</button>}
  </div>);
}
