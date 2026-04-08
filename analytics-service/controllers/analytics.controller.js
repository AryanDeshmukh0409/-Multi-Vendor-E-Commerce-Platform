const { OrderSummary, AnalyticsEvent } = require('../models/AnalyticsEvent');
const ApiError = require('../../shared/utils/apiError');
const axios    = require('axios');

const ORDER_SVC   = process.env.ORDER_SVC_URL   || 'http://localhost:4005';
const SELLER_SVC  = process.env.SELLER_SVC_URL  || 'http://localhost:4002';

// ── Helper: fetch all orders directly from order-service ──
async function fetchAllOrders(token) {
  try {
    const res = await axios.get(`${ORDER_SVC}/orders`, {
      params: { limit: 100 },
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.orders || [];
  } catch (err) {
    console.error('[analytics] Failed to fetch orders:', err.message);
    return [];
  }
}

// ── GET /analytics/revenue ────────────────────
async function revenueByDay(req, res, next) {
  try {
    const orders = await fetchAllOrders(req.headers.authorization?.split(' ')[1]);

    // Group by date
    const byDate = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = { gmv: 0, orderCount: 0, totalAvg: 0 };
      byDate[date].gmv        += order.totalAmount;
      byDate[date].orderCount += 1;
      byDate[date].totalAvg   += order.totalAmount;
    });

    const data = Object.entries(byDate).map(([date, d]) => ({
      _id:        date,
      gmv:        d.gmv,
      orderCount: d.orderCount,
      avgOrder:   d.totalAvg / d.orderCount,
    })).sort((a, b) => a._id.localeCompare(b._id));

    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ── GET /analytics/top-products ───────────────
async function topProducts(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const orders = await fetchAllOrders(req.headers.authorization?.split(' ')[1]);

    const productMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const id = item.productId;
        if (!productMap[id]) productMap[id] = { productId: id, revenue: 0, unitsSold: 0, title: item.title };
        productMap[id].revenue   += item.price * item.qty;
        productMap[id].unitsSold += item.qty;
      });
    });

    const sorted = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, Number(limit));

    res.json({ success: true, data: sorted });
  } catch (err) { next(err); }
}

// ── GET /analytics/top-sellers ────────────────
async function topSellers(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const orders = await fetchAllOrders(req.headers.authorization?.split(' ')[1]);

    const sellerMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const id = item.sellerId;
        if (!sellerMap[id]) sellerMap[id] = { sellerId: id, orderCount: 0, revenue: 0 };
        sellerMap[id].orderCount += 1;
        sellerMap[id].revenue    += item.price * item.qty;
      });
    });

    const sorted = Object.values(sellerMap)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, Number(limit));

    res.json({ success: true, data: sorted });
  } catch (err) { next(err); }
}

// ── GET /analytics/orders-by-category ─────────
async function ordersByCategory(req, res, next) {
  try {
    const orders = await fetchAllOrders(req.headers.authorization?.split(' ')[1]);

    const catMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const cat = item.category || 'unknown';
        if (!catMap[cat]) catMap[cat] = { category: cat, revenue: 0, orders: 0 };
        catMap[cat].revenue += item.price * item.qty;
        catMap[cat].orders  += 1;
      });
    });

    const data = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ── GET /analytics/seller/me ──────────────────
async function sellerStats(req, res, next) {
  try {
    const sellerId = req.user.sub;
    const orders   = await fetchAllOrders(req.headers.authorization?.split(' ')[1]);

    const myOrders = orders.filter(o =>
      o.items.some(i => i.sellerId === sellerId)
    );

    const totalRevenue = myOrders.reduce((s, o) => {
      return s + o.items.filter(i => i.sellerId === sellerId)
        .reduce((si, i) => si + i.price * i.qty, 0);
    }, 0);

    const byDay = {};
    myOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!byDay[date]) byDay[date] = { revenue: 0, orderCount: 0 };
      byDay[date].orderCount += 1;
      byDay[date].revenue    += order.items
        .filter(i => i.sellerId === sellerId)
        .reduce((s, i) => s + i.price * i.qty, 0);
    });

    const daily = Object.entries(byDay)
      .map(([date, d]) => ({ _id: date, ...d }))
      .sort((a, b) => b._id.localeCompare(a._id))
      .slice(0, 30);

    res.json({
      success: true,
      summary: {
        totalOrders:   myOrders.length,
        totalRevenue,
        avgOrderValue: myOrders.length ? totalRevenue / myOrders.length : 0,
      },
      daily,
    });
  } catch (err) { next(err); }
}

module.exports = { revenueByDay, topProducts, topSellers, ordersByCategory, sellerStats };