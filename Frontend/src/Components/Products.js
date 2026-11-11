import React, { useEffect, useState } from 'react';
import { getProducts, createProduct, addToCart } from '../api';
export default function Products(){
  const [items,setItems]=useState([]); const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [msg,setMsg]=useState('');
  const load=()=>getProducts().then(d=>setItems(d.data||d||[])).catch(e=>setMsg('Failed to load products - is api-gateway running? '+e.message));
  useEffect(()=>{load()},[]);
  const handleCreate=async(e)=>{e.preventDefault(); try{ await createProduct({name, data:{price: Number(price)}}); setName(''); setPrice(''); setMsg('✅ Product created via api-gateway → product-service'); load(); }catch(err){ setMsg('❌ '+err.message)} };
  const handleAdd=async(item)=>{ try{ await addToCart({name:item.name, data:{productId:item.id, qty:1}}); setMsg(`✅ Added ${item.name} to cart via cart-service`);}catch(err){ setMsg('Cart: '+err.message)} };
  return (<div>
    <h2>Products <span className="pill">product-service:8003 via gateway</span></h2>
    <p>{msg}</p>
    <form onSubmit={handleCreate} className="card" style={{maxWidth:520}}><h3>Add Product</h3>
      <input placeholder="Product name e.g. Nike Shoe" value={name} onChange={e=>setName(e.target.value)} required/>
      <input placeholder="Price e.g. 150" type="number" value={price} onChange={e=>setPrice(e.target.value)} required/>
      <button className="btn btn-primary" type="submit">Create Product</button>
    </form>
    <div className="grid" style={{marginTop:16}}>
      {items.length===0 && <div className="card">No products yet. Create one above.</div>}
      {items.map((p,i)=>(<div key={p.id||i} className="card"><span className="pill">ID: {p.id}</span><h3>{p.name}</h3><div className="price">${p.data?.price ?? '—'}</div><p>Service: {p.service||'product-service'}</p><button className="btn" onClick={()=>handleAdd(p)}>Add to Cart</button></div>))}
    </div>
  </div>);
}
