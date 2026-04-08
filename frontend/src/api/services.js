import axios from 'axios';

// ── Service URLs ──────────────────────────────
const AUTH_URL      = 'http://localhost:4001';
const CATALOG_URL   = 'http://localhost:4003';
const SEARCH_URL    = 'http://localhost:4010';
const ORDER_URL     = 'http://localhost:4005';
const PAYMENT_URL   = 'http://localhost:4006';
const SHIPPING_URL  = 'http://localhost:4007';
const REVIEW_URL    = 'http://localhost:4008';
const SELLER_URL    = 'http://localhost:4002';
const INVENTORY_URL = 'http://localhost:4004';
const ANALYTICS_URL = 'http://localhost:4011/analytics';

// ── Helper ────────────────────────────────────
const authHeader = token => ({ headers: { Authorization: `Bearer ${token}` } });

// ── Auth ──────────────────────────────────────
export const authAPI = {
  register: (data)         => axios.post(`${AUTH_URL}/auth/register`, data),
  login:    (data)         => axios.post(`${AUTH_URL}/auth/login`, data),
};

// ── Catalog ───────────────────────────────────
export const catalogAPI = {
  listProducts:   (params)       => axios.get(`${CATALOG_URL}/products`, { params }),
  getProduct:     (id)           => axios.get(`${CATALOG_URL}/products/${id}`),
  createProduct:  (data, token)  => axios.post(`${CATALOG_URL}/products`, data, authHeader(token)),
  updateProduct:  (id, data, token) => axios.put(`${CATALOG_URL}/products/${id}`, data, authHeader(token)),
  deleteProduct:  (id, token)    => axios.delete(`${CATALOG_URL}/products/${id}`, authHeader(token)),
  updateStore: (data, token) => axios.patch(`${SELLER_URL}/me`, data, authHeader(token)),
};

// ── Search ────────────────────────────────────
export const searchAPI = {
  search:   (params) => axios.get(`${SEARCH_URL}/`, { params }),
  suggest:  (q)      => axios.get(`${SEARCH_URL}/suggest`, { params: { q } }),
};

// ── Orders ────────────────────────────────────
export const orderAPI = {
  createOrder: (data, token)  => axios.post(`${ORDER_URL}/orders`, data, authHeader(token)),
  listOrders:  (token)        => axios.get(`${ORDER_URL}/orders`, authHeader(token)),
  getOrder:    (id, token)    => axios.get(`${ORDER_URL}/orders/${id}`, authHeader(token)),
  cancelOrder: (id, token)    => axios.patch(`${ORDER_URL}/orders/${id}/cancel`, {}, authHeader(token)),
};

// ── Payments ──────────────────────────────────
export const paymentAPI = {
  capture:    (data, token)   => axios.post(`${PAYMENT_URL}/capture`, data, authHeader(token)),
  getPayment: (orderId, token)=> axios.get(`${PAYMENT_URL}/order/${orderId}`, authHeader(token)),
};

// ── Shipping ──────────────────────────────────
export const shippingAPI = {
  createShipment:     (data, token)    => axios.post(`${SHIPPING_URL}/`, data, authHeader(token)),
  getMyShipments:     (token)          => axios.get(`${SHIPPING_URL}/my`, authHeader(token)),
  getShipmentByOrder: (orderId, token) => axios.get(`${SHIPPING_URL}/order/${orderId}`, authHeader(token)),
};

// ── Reviews ───────────────────────────────────
export const reviewAPI = {
  createReview:      (data, token)      => axios.post(`${REVIEW_URL}/`, data, authHeader(token)),
  getProductReviews: (productId)        => axios.get(`${REVIEW_URL}/product/${productId}`),
  getPending:        (token)            => axios.get(`${REVIEW_URL}/pending`, authHeader(token)),
  approveReview:     (id, token)        => axios.patch(`${REVIEW_URL}/${id}/approve`, {}, authHeader(token)),
  flagReview:        (id, token)        => axios.patch(`${REVIEW_URL}/${id}/flag`, {}, authHeader(token)),
};

// ── Seller ────────────────────────────────────
export const sellerAPI = {
  registerStore: (data, token)  => axios.post(`${SELLER_URL}/register`, data, authHeader(token)),
  getMyStore:    (token)        => axios.get(`${SELLER_URL}/me`, authHeader(token)),
  updateStore:   (data, token)  => axios.patch(`${SELLER_URL}/me`, data, authHeader(token)),
  getDashboard:  (token)        => axios.get(`${SELLER_URL}/dashboard`, authHeader(token)),
};

// ── Inventory ─────────────────────────────────
export const inventoryAPI = {
  listMyInventory: (token)           => axios.get(`${INVENTORY_URL}/`, authHeader(token)),
  getStock:        (productId, token)=> axios.get(`${INVENTORY_URL}/${productId}`, authHeader(token)),
  setStock:        (productId, data, token) => axios.patch(`${INVENTORY_URL}/${productId}`, data, authHeader(token)),
};

// ── Analytics ─────────────────────────────────
export const analyticsAPI = {
  getSellerStats: (token) => axios.get(`${ANALYTICS_URL}/seller/me`, authHeader(token)),
  getRevenue:     (token) => axios.get(`${ANALYTICS_URL}/revenue`, authHeader(token)),
  getTopProducts: (token) => axios.get(`${ANALYTICS_URL}/top-products`, authHeader(token)),
};