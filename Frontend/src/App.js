import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './Components/Home';
import Products from './Components/Products';
import Cart from './Components/Cart';
import Orders from './Components/Orders';
import Services from './Components/Services';
import Navbar from './Components/Navbar';
export default function App(){
  return (<BrowserRouter>
    <Navbar/>
    <div className="container">
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/products" element={<Products/>}/>
        <Route path="/cart" element={<Cart/>}/>
        <Route path="/orders" element={<Orders/>}/>
        <Route path="/services" element={<Services/>}/>
      </Routes>
    </div>
  </BrowserRouter>);
}
