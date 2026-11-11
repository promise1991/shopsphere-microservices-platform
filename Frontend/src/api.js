import axios from 'axios';
// In K8s, nginx proxies /api -> api-gateway:8000
// In local dev, REACT_APP_API_URL=http://localhost:8000
const API = process.env.REACT_APP_API_URL || '/api';
export const api = axios.create({ baseURL: API, timeout: 5000 });
export const getProducts = () => api.get('/product').then(r=>r.data);
export const createProduct = (payload) => api.post('/product', payload).then(r=>r.data);
export const getCart = () => api.get('/cart').then(r=>r.data);
export const addToCart = (payload) => api.post('/cart', payload).then(r=>r.data);
export const getOrders = () => api.get('/order').then(r=>r.data);
export const createOrder = (payload) => api.post('/order', payload).then(r=>r.data);
export const getUsers = () => api.get('/user').then(r=>r.data);
export const checkHealth = (service) => api.get(`/${service}/health`).catch(()=>({status:'down'}));
