const nodemailer = require('nodemailer');

let transporter = null;
let etherealUrl = null;

// Auto-create Ethereal test account on startup
async function initTransporter() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: {
        rejectUnauthorized: false
      },
    });
    console.log(`[notification] ✉ Ethereal inbox ready`);
    console.log(`[notification] 📧 View emails at: https://ethereal.email/login`);
    console.log(`[notification]    Email: ${testAccount.user}`);
    console.log(`[notification]    Pass:  ${testAccount.pass}`);
  } catch (err) {
    console.error('[notification] Failed to create Ethereal account:', err.message);
    // Fallback to console logging
    transporter = {
      sendMail: async (opts) => {
        console.log(`[notification] 📧 EMAIL LOG:`);
        console.log(`   To: ${opts.to}`);
        console.log(`   Subject: ${opts.subject}`);
        return { messageId: 'console-' + Date.now() };
      }
    };
  }
}

// Initialize on load
initTransporter();

async function send({ to, subject, html }) {
  try {
    if (!transporter) {
      console.log(`[notification] Transporter not ready, queuing: "${subject}" to ${to}`);
      return;
    }
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@multivendor.dev',
      to, subject, html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[notification] ✓ Sent "${subject}" to ${to}`);
    if (previewUrl) console.log(`[notification]   Preview: ${previewUrl}`);
  } catch (err) {
    console.error(`[notification] Failed to send to ${to}:`, err.message);
  }
}

// ── Email templates ──────────────────────────

function orderConfirmed(payload) {
  return {
    subject: `Order Confirmed — #${payload.orderId}`,
    html: `
      <h2>Your order has been placed!</h2>
      <p>Order ID: <strong>${payload.orderId}</strong></p>
      <p>Total: <strong>$${(payload.totalAmount / 100).toFixed(2)}</strong></p>
      <p>Items: ${payload.items?.length || 0}</p>
      <p>You'll receive another email when your order ships.</p>
    `,
  };
}

function orderShipped(payload) {
  return {
    subject: `Your Order Has Shipped — Tracking: ${payload.trackingNumber}`,
    html: `
      <h2>Your order is on its way!</h2>
      <p>Order ID: <strong>${payload.orderId}</strong></p>
      <p>Carrier: <strong>${payload.carrier}</strong></p>
      <p>Tracking Number: <strong>${payload.trackingNumber}</strong></p>
    `,
  };
}

function orderDelivered(payload) {
  return {
    subject: `Order Delivered — Leave a Review!`,
    html: `
      <h2>Your order has been delivered!</h2>
      <p>Order ID: <strong>${payload.orderId}</strong></p>
      <p>You can now leave a review for items in your order.</p>
    `,
  };
}

function paymentCaptured(payload) {
  return {
    subject: `New Order Received — #${payload.orderId}`,
    html: `
      <h2>You have a new order!</h2>
      <p>Order ID: <strong>${payload.orderId}</strong></p>
      <p>Prepare the items for shipment.</p>
    `,
  };
}

function escrowReleased(payload) {
  return {
    subject: `Payout Released — $${(payload.amount / 100).toFixed(2)}`,
    html: `
      <h2>Your escrow has been released!</h2>
      <p>Order ID: <strong>${payload.orderId}</strong></p>
      <p>Amount: <strong>$${(payload.amount / 100).toFixed(2)}</strong></p>
      <p>Funds will appear in your account within 2-3 business days.</p>
    `,
  };
}

function lowStock(payload) {
  return {
    subject: `Low Stock Alert — Product ${payload.productId}`,
    html: `
      <h2>Stock is running low!</h2>
      <p>Product ID: <strong>${payload.productId}</strong></p>
      <p>Current stock: <strong>${payload.quantity}</strong> units</p>
      <p>Please restock soon to avoid missing orders.</p>
    `,
  };
}

function paymentRefunded(payload) {
  return {
    subject: `Refund Processed — #${payload.orderId}`,
    html: `
      <h2>Your refund has been processed.</h2>
      <p>Order ID: <strong>${payload.orderId}</strong></p>
      <p>Amount: <strong>$${(payload.totalAmount / 100).toFixed(2)}</strong></p>
      <p>Funds will appear within 5-7 business days.</p>
    `,
  };
}

module.exports = { send, orderConfirmed, orderShipped, orderDelivered, paymentCaptured, escrowReleased, lowStock, paymentRefunded };