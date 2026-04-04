import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, paymentAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { user, token }         = useAuth();
  const navigate                = useNavigate();
  const [cart, setCart]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [orderId, setOrderId]   = useState(null);

  const [address, setAddress] = useState({
    street: '', city: '', zip: '', country: 'Canada'
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(saved);
  }, []);

  const updateQty = (id, qty) => {
    if (qty < 1) return removeItem(id);
    const updated = cart.map(i => i._id === id ? { ...i, qty } : i);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (id) => {
    const updated = cart.filter(i => i._id !== id);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    if (cart.length === 0) { setError('Your cart is empty'); return; }
    if (!address.street || !address.city || !address.zip)  {
      setError('Please fill in all address fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1 — Place order
      const orderRes = await orderAPI.createOrder({
        items: cart.map(i => ({
          productId: i._id,
          sellerId:  i.sellerId,
          title:     i.title,
          price:     i.price,
          qty:       i.qty,
        })),
        shippingAddress: address,
      }, token);

      const newOrderId = orderRes.data.order._id;
      setOrderId(newOrderId);

      // Step 2 — Capture payment
      await paymentAPI.capture({ orderId: newOrderId, method: 'card' }, token);

      // Step 3 — Clear cart
      clearCart();

      setSuccess(`🎉 Order placed successfully! Order ID: ${newOrderId}`);

    } catch (err) {
      setError(err.response?.data?.error?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>🎉</div>
          <h2 style={styles.successTitle}>Order Placed!</h2>
          <p style={styles.successText}>{success}</p>
          <div style={styles.successBtns}>
            <button onClick={() => navigate('/orders')} style={styles.trackBtn}>
              Track Order
            </button>
            <button onClick={() => navigate('/')} style={styles.shopBtn}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>🛒 Your Cart</h1>

        {cart.length === 0 ? (
          <div style={styles.emptyCart}>
            <div style={styles.emptyIcon}>🛒</div>
            <h2 style={styles.emptyText}>Your cart is empty</h2>
            <button onClick={() => navigate('/')} style={styles.shopNowBtn}>
              Start Shopping
            </button>
          </div>
        ) : (
          <div style={styles.layout}>

            {/* Cart items */}
            <div style={styles.itemsSection}>
              <h2 style={styles.sectionTitle}>Items ({cart.length})</h2>

              {cart.map(item => (
                <div key={item._id} style={styles.cartItem}>
                  <div style={styles.itemImage}>
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.title} style={styles.itemImg} />
                      : <div style={styles.itemNoImg}>📦</div>
                    }
                  </div>
                  <div style={styles.itemInfo}>
                    <h3 style={styles.itemTitle}>{item.title}</h3>
                    <p style={styles.itemCategory}>{item.category}</p>
                    <p style={styles.itemPrice}>${(item.price / 100).toFixed(2)} each</p>
                  </div>
                  <div style={styles.itemControls}>
                    <div style={styles.qtyRow}>
                      <button onClick={() => updateQty(item._id, item.qty - 1)} style={styles.qtyBtn}>−</button>
                      <span style={styles.qtyVal}>{item.qty}</span>
                      <button onClick={() => updateQty(item._id, item.qty + 1)} style={styles.qtyBtn}>+</button>
                    </div>
                    <p style={styles.itemTotal}>${(item.price * item.qty / 100).toFixed(2)}</p>
                    <button onClick={() => removeItem(item._id)} style={styles.removeBtn}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout section */}
            <div style={styles.checkoutSection}>

              {/* Address */}
              <div style={styles.addressBox}>
                <h3 style={styles.addressTitle}>📍 Shipping Address</h3>
                {['street', 'city', 'zip', 'country'].map(field => (
                  <div key={field} style={styles.field}>
                    <label style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input
                      type="text"
                      value={address[field]}
                      onChange={e => setAddress(a => ({ ...a, [field]: e.target.value }))}
                      style={styles.input}
                      placeholder={field === 'street' ? '123 Main St' : field === 'city' ? 'Toronto' : field === 'zip' ? 'M1A1A1' : 'Canada'}
                    />
                  </div>
                ))}
              </div>

              {/* Order summary */}
              <div style={styles.summaryBox}>
                <h3 style={styles.summaryTitle}>Order Summary</h3>
                {cart.map(item => (
                  <div key={item._id} style={styles.summaryItem}>
                    <span style={styles.summaryName}>{item.title} x{item.qty}</span>
                    <span style={styles.summaryPrice}>${(item.price * item.qty / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div style={styles.divider} />
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Total</span>
                  <span style={styles.totalAmount}>${(total / 100).toFixed(2)}</span>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <button
                  onClick={handleCheckout}
                  style={styles.checkoutBtn}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : '💳 Place Order & Pay'}
                </button>

                <p style={styles.secureNote}>🔒 Secure checkout — Mock payment for demo</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page:      { backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#fff' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  pageTitle: { color: '#fff', fontSize: '1.8rem', marginBottom: '2rem' },

  emptyCart:   { textAlign: 'center', padding: '4rem' },
  emptyIcon:   { fontSize: '4rem', marginBottom: '1rem' },
  emptyText:   { color: '#aaa', marginBottom: '1.5rem' },
  shopNowBtn:  { padding: '0.8rem 2rem', backgroundColor: '#e94560', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem' },

  layout:         { display: 'flex', gap: '2rem', flexWrap: 'wrap' },
  itemsSection:   { flex: 1, minWidth: '300px' },
  sectionTitle:   { color: '#fff', marginBottom: '1rem' },
  checkoutSection:{ width: '350px', flexShrink: 0 },

  cartItem:    { backgroundColor: '#16213e', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' },
  itemImage:   { width: '80px', height: '80px', backgroundColor: '#0f3460', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemImg:     { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' },
  itemNoImg:   { fontSize: '2rem' },
  itemInfo:    { flex: 1 },
  itemTitle:   { color: '#fff', margin: '0 0 0.3rem', fontSize: '0.95rem' },
  itemCategory:{ color: '#e94560', fontSize: '0.75rem', margin: '0 0 0.3rem' },
  itemPrice:   { color: '#aaa', fontSize: '0.85rem', margin: 0 },
  itemControls:{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' },
  qtyRow:      { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  qtyBtn:      { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', cursor: 'pointer' },
  qtyVal:      { color: '#fff', minWidth: '1.5rem', textAlign: 'center' },
  itemTotal:   { color: '#4ecca3', fontWeight: 'bold', margin: 0 },
  removeBtn:   { backgroundColor: 'transparent', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: '0.8rem' },

  addressBox:   { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem' },
  addressTitle: { color: '#fff', margin: '0 0 1rem', fontSize: '1rem' },
  field:        { marginBottom: '0.8rem' },
  label:        { color: '#aaa', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' },
  input:        { width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' },

  summaryBox:   { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.2rem' },
  summaryTitle: { color: '#fff', margin: '0 0 1rem', fontSize: '1rem' },
  summaryItem:  { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' },
  summaryName:  { color: '#aaa', fontSize: '0.85rem' },
  summaryPrice: { color: '#fff', fontSize: '0.85rem' },
  divider:      { borderTop: '1px solid #0f3460', margin: '1rem 0' },
  totalRow:     { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  totalLabel:   { color: '#fff', fontWeight: 'bold' },
  totalAmount:  { color: '#4ecca3', fontWeight: 'bold', fontSize: '1.2rem' },
  error:        { backgroundColor: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.85rem' },
  checkoutBtn:  { width: '100%', padding: '0.9rem', borderRadius: '10px', backgroundColor: '#e94560', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', marginBottom: '0.8rem' },
  secureNote:   { color: '#aaa', fontSize: '0.75rem', textAlign: 'center', margin: 0 },

  successBox:   { maxWidth: '500px', margin: '4rem auto', backgroundColor: '#16213e', borderRadius: '16px', padding: '3rem', textAlign: 'center' },
  successIcon:  { fontSize: '4rem', marginBottom: '1rem' },
  successTitle: { color: '#fff', fontSize: '1.8rem', marginBottom: '1rem' },
  successText:  { color: '#aaa', marginBottom: '2rem', lineHeight: 1.6 },
  successBtns:  { display: 'flex', gap: '1rem', justifyContent: 'center' },
  trackBtn:     { padding: '0.8rem 1.5rem', backgroundColor: '#4ecca3', border: 'none', color: '#000', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  shopBtn:      { padding: '0.8rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #aaa', color: '#aaa', borderRadius: '10px', cursor: 'pointer' },
};