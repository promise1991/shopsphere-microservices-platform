import React from 'react';
import { NavLink } from 'react-router-dom';
export default function Navbar(){
  return (<div className="topbar"><div className="topbar-inner">
    <div className="logo">Shop<span>Sphere</span> <span style={{fontSize:12,background:'#2563eb',padding:'3px 8px',borderRadius:999}}>Microservices • 12 Services</span></div>
    <div className="nav">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/products">Products</NavLink>
      <NavLink to="/cart">Cart</NavLink>
      <NavLink to="/orders">Orders</NavLink>
      <NavLink to="/services">Services Health</NavLink>
    </div>
  </div></div>);
}
