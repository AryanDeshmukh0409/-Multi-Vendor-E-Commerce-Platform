const axios = require('axios');

const ORDER_SVC    = process.env.ORDER_SVC_URL    || 'http://localhost:4005';
const SHIPPING_SVC = process.env.SHIPPING_SVC_URL || 'http://localhost:4007';
const PRODUCT_SVC  = process.env.PRODUCT_SVC_URL  || 'http://localhost:4003';

// ── Fetch buyer's orders ──
async function fetchOrders(token) {
  try {
    const res = await axios.get(`${ORDER_SVC}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000
    });
    return res.data.orders || [];
  } catch (e) {
    console.error('[chat-llm] Failed to fetch orders:', e.message);
    return [];
  }
}

// ── Fetch shipment for an order ──
async function fetchShipment(orderId, token) {
  try {
    const res = await axios.get(`${SHIPPING_SVC}/order/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000
    });
    return res.data.shipment || null;
  } catch (e) {
    return null;
  }
}

// ── Fetch product details ──
async function fetchProduct(productId) {
  try {
    const res = await axios.get(`${PRODUCT_SVC}/products/${productId}`, { timeout: 3000 });
    return res.data.product || null;
  } catch (e) {
    return null;
  }
}

// ── Intent detection ──
function detectIntent(message) {
  const msg = message.toLowerCase();

  if (msg.match(/track|where|shipping|shipment|deliver|status of.*order|order.*status/))
    return 'track_order';
  if (msg.match(/cancel|refund|return/))
    return 'cancel_order';
  if (msg.match(/what.*order|my order|order.*detail|show.*order|list.*order|recent.*order/))
    return 'list_orders';
  if (msg.match(/product|item|what.*buy|what.*bought|purchase/))
    return 'product_info';
  if (msg.match(/pay|payment|escrow|paid|amount|total|cost|price.*order/))
    return 'payment_info';
  if (msg.match(/help|support|how.*work|what can you/))
    return 'help';
  if (msg.match(/hello|hi|hey|good morning|good evening/))
    return 'greeting';

  return 'general';
}

// ── Format currency ──
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Generate response based on intent ──
async function generateResponse(message, token) {
  const intent = detectIntent(message);

  switch (intent) {
    case 'greeting':
      return "Hello! I'm your MultiVendor shopping assistant. I can help you with:\n\n• Checking your order status and tracking\n• Viewing your order details and history\n• Product and payment information\n• Cancellation and refund queries\n\nWhat would you like to know?";

    case 'help':
      return "Here's what I can help you with:\n\n• **Order Tracking** — Ask \"Where is my order?\" or \"Track my order\"\n• **Order Details** — Ask \"Show my orders\" or \"What did I order?\"\n• **Payment Info** — Ask \"How much did I pay?\" or \"Payment status\"\n• **Cancellations** — Ask \"Can I cancel my order?\"\n\nJust type your question and I'll look it up for you!";

    case 'list_orders': {
      const orders = await fetchOrders(token);
      if (orders.length === 0)
        return "You don't have any orders yet. Start shopping and place your first order!";

      let response = `You have **${orders.length} order(s)**:\n\n`;
      for (const order of orders.slice(0, 5)) {
        const date = new Date(order.createdAt).toLocaleDateString();
        const itemCount = order.items?.length || 0;
        response += `• **Order #${order._id.slice(-6).toUpperCase()}** — ${itemCount} item(s) — ${formatPrice(order.totalAmount)} — Status: **${order.status}** — Placed: ${date}\n`;
      }
      if (orders.length > 5)
        response += `\n...and ${orders.length - 5} more orders.`;

      return response;
    }

    case 'track_order': {
      const orders = await fetchOrders(token);
      if (orders.length === 0)
        return "You don't have any orders to track. Place an order first!";

      const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

      if (activeOrders.length === 0) {
        const lastOrder = orders[0];
        return `Your most recent order **#${lastOrder._id.slice(-6).toUpperCase()}** has been **${lastOrder.status}**. All your orders are completed!`;
      }

      let response = '';
      for (const order of activeOrders.slice(0, 3)) {
        response += `**Order #${order._id.slice(-6).toUpperCase()}** — Status: **${order.status}**\n`;

        const shipment = await fetchShipment(order._id, token);
        if (shipment) {
          response += `  📦 Carrier: ${shipment.carrier} — Tracking: ${shipment.trackingNumber}\n`;
          if (shipment.estimatedDelivery)
            response += `  📅 Estimated delivery: ${new Date(shipment.estimatedDelivery).toLocaleDateString()}\n`;
        } else if (order.status === 'paid' || order.status === 'processing') {
          response += `  ⏳ Waiting for seller to ship\n`;
        }
        response += '\n';
      }

      return response.trim();
    }

    case 'payment_info': {
      const orders = await fetchOrders(token);
      if (orders.length === 0)
        return "No orders found. You haven't made any payments yet.";

      const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const lastOrder = orders[0];

      return `**Payment Summary:**\n\n• Total orders: ${orders.length}\n• Total spent: ${formatPrice(totalSpent)}\n• Last order: **#${lastOrder._id.slice(-6).toUpperCase()}** — ${formatPrice(lastOrder.totalAmount)} — Status: **${lastOrder.status}**\n\nOur platform uses an escrow payment system. Your payment is held securely until the seller ships your items.`;
    }

    case 'cancel_order': {
      const orders = await fetchOrders(token);
      const pendingOrders = orders.filter(o => o.status === 'pending');

      if (pendingOrders.length === 0)
        return "You don't have any orders that can be cancelled. Orders can only be cancelled while in **pending** status. Once paid or shipped, please contact support for assistance.";

      let response = `You have **${pendingOrders.length}** order(s) that can be cancelled:\n\n`;
      for (const order of pendingOrders) {
        response += `• **Order #${order._id.slice(-6).toUpperCase()}** — ${formatPrice(order.totalAmount)} — Placed: ${new Date(order.createdAt).toLocaleDateString()}\n`;
      }
      response += `\nTo cancel, go to your Orders page and click the Cancel button.`;
      return response;
    }

    case 'product_info': {
      const orders = await fetchOrders(token);
      if (orders.length === 0)
        return "You haven't purchased any products yet. Browse our catalog to find something you like!";

      const allItems = orders.flatMap(o => o.items || []);
      const uniqueProducts = {};
      allItems.forEach(item => {
        if (!uniqueProducts[item.productId]) {
          uniqueProducts[item.productId] = {
            title: item.title || 'Unknown Product',
            totalQty: 0,
            totalSpent: 0
          };
        }
        uniqueProducts[item.productId].totalQty += item.qty;
        uniqueProducts[item.productId].totalSpent += item.price * item.qty;
      });

      let response = `**Products you've ordered:**\n\n`;
      for (const [id, product] of Object.entries(uniqueProducts)) {
        response += `• **${product.title}** — Qty: ${product.totalQty} — Total: ${formatPrice(product.totalSpent)}\n`;
      }

      return response;
    }

    default:
      return "I'm not sure I understand that question. I can help you with:\n\n• **Order tracking** — \"Where is my order?\"\n• **Order history** — \"Show my orders\"\n• **Payment details** — \"How much did I pay?\"\n• **Cancellations** — \"Can I cancel my order?\"\n\nTry asking one of these!";
  }
}

module.exports = { generateResponse };