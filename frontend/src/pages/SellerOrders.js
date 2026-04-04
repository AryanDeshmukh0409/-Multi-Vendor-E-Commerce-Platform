import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, shippingAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  pending:    '#aaa',
  paid:       '#4ecca3',
  processing: '#f0a500',
  shipped:    '#3b82f6',
  delivered:  '#22c55e',
  cancelled:  '#e94560',
};

export default function SellerOrders() {
  const { user, token }       = useAuth();
  const navigate              = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [shipForm, setShipForm] = useState({ carrier: 'FedEx', trackingNumber: '', estimatedDelivery: '' });
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'seller') { navigate('/login'); return; }
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await orderAPI.listOrders(token);
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await shippingAPI.createShipment({
        orderId:           shippingOrderId,
        carrier:           shipForm.carrier,
        trackingNumber:    shipForm.trackingNumber,
        estimatedDelivery: shipForm.estimatedDelivery || undefined,
      }, token);

      setSuccess(`✅ Shipment created! Tracking: ${shipForm.trackingNumber}`);
      setShippingOrderId(null);
      setShipForm({ carrier: 'FedEx', trackingNumber: '', estimatedDelivery: '' });
      fetchOrders();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create shipment');
    }
  };

  if (loading) return <div style={styles.loading}>Loading orders...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <button onClick={() => navigate('/seller/dashboard')} style={styles.backBtn}>← Dashboard</button>
            <h1 style={styles.title}>🚚 Manage Orders</h1>
          </div>
        </div>

        {success && <div style={styles.success}>{success}</div>}
        {error   && <div style={styles.error}>{error}</div>}

        {orders.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📭</div>
            <p style={styles.emptyText}>No orders yet</p>
          </div>
        ) : (
          <div style={styles.ordersList}>
            {orders.map(order => (
              <div key={order._id} style={styles.orderCard}>

                {/* Order header */}
                <div style={styles.orderHeader} onClick={() => setSelected(selected === order._id ? null : order._id)}>
                  <div style={styles.orderLeft}>
                    <span style={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</span>
                    <span style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={styles.orderRight}>
                    <span style={{ ...styles.statusBadge, color: STATUS_COLORS[order.status], borderColor: STATUS_COLORS[order.status] }}>
                      {order.status.toUpperCase()}
                    </span>
                    <span style={styles.orderTotal}>${(order.totalAmount / 100).toFixed(2)}</span>
                    {order.status === 'processing' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShippingOrderId(order._id); }}
                        style={styles.shipBtn}
                      >
                        🚚 Ship Now
                      </button>
                    )}
                    <span style={styles.expandIcon}>{selected === order._id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Ship form */}
                {shippingOrderId === order._id && (
                  <div style={styles.shipFormBox}>
                    <h4 style={styles.shipFormTitle}>Create Shipment</h4>
                    <form onSubmit={handleShip} style={styles.shipForm}>
                      <div style={styles.shipFormGrid}>
                        <div style={styles.field}>
                          <label style={styles.label}>Carrier</label>
                          <select value={shipForm.carrier} onChange={e => setShipForm(f => ({...f, carrier: e.target.value}))} style={styles.input}>
                            {['FedEx','UPS','DHL','Canada Post','Other'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={styles.field}>
                          <label style={styles.label}>Tracking Number *</label>
                          <input value={shipForm.trackingNumber} onChange={e => setShipForm(f => ({...f, trackingNumber: e.target.value}))} style={styles.input} placeholder="TRACK123456" required />
                        </div>
                        <div style={styles.field}>
                          <label style={styles.label}>Estimated Delivery</label>
                          <input type="date" value={shipForm.estimatedDelivery} onChange={e => setShipForm(f => ({...f, estimatedDelivery: e.target.value}))} style={styles.input} />
                        </div>
                      </div>
                      <div style={styles.shipFormBtns}>
                        <button type="submit" style={styles.confirmShipBtn}>✅ Confirm Shipment</button>
                        <button type="button" onClick={() => setShippingOrderId(null)} style={styles.cancelBtn}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Expanded details */}
                {selected === order._id && (
                  <div style={styles.orderDetails}>
                    <h4 style={styles.sectionLabel}>ITEMS</h4>
                    {order.items.map((item, i) => (
                      <div key={i} style={styles.item}>
                        <span style={styles.itemName}>{item.title}</span>
                        <span style={styles.itemQty}>x{item.qty}</span>
                        <span style={styles.itemPrice}>${(item.price * item.qty / 100).toFixed(2)}</span>
                      </div>
                    ))}

                    <h4 style={{ ...styles.sectionLabel, marginTop: '1rem' }}>SHIPPING TO</h4>
                    <p style={styles.address}>
                      {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.zip}, {order.shippingAddress.country}
                    </p>

                    <h4 style={{ ...styles.sectionLabel, marginTop: '1rem' }}>TIMELINE</h4>
                    {order.timeline.map((t, i) => (
                      <div key={i} style={styles.timelineItem}>
                        <div style={{ ...styles.timelineDot, backgroundColor: STATUS_COLORS[t.status] || '#aaa' }} />
                        <div>
                          <span style={styles.timelineStatus}>{t.status}</span>
                          {t.note && <span style={styles.timelineNote}> — {t.note}</span>}
                          <div style={styles.timelineTime}>{new Date(t.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page:      { backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#fff' },
  container: { maxWidth: '1000px', margin: '0 auto', padding: '2rem' },
  loading:   { color: '#aaa', textAlign: 'center', padding: '4rem', backgroundColor: '#0a0a1a' },

  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem', padding: 0 },
  title:   { color: '#fff', fontSize: '1.8rem', margin: 0 },

  success: { backgroundColor: '#4ecca320', border: '1px solid #4ecca3', color: '#4ecca3', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },
  error:   { backgroundColor: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },

  empty:     { textAlign: 'center', padding: '3rem', backgroundColor: '#16213e', borderRadius: '12px' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyText: { color: '#aaa' },

  ordersList:  { display: 'flex', flexDirection: 'column', gap: '1rem' },
  orderCard:   { backgroundColor: '#16213e', borderRadius: '12px', overflow: 'hidden' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', cursor: 'pointer', flexWrap: 'wrap', gap: '0.5rem' },
  orderLeft:   { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  orderId:     { color: '#fff', fontWeight: 'bold' },
  orderDate:   { color: '#aaa', fontSize: '0.8rem' },
  orderRight:  { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  statusBadge: { padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid' },
  orderTotal:  { color: '#4ecca3', fontWeight: 'bold' },
  shipBtn:     { padding: '0.4rem 1rem', backgroundColor: '#e94560', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' },
  expandIcon:  { color: '#aaa', fontSize: '0.8rem' },

  shipFormBox:   { backgroundColor: '#0f3460', padding: '1.2rem 1.5rem', borderTop: '1px solid #1a4a8a' },
  shipFormTitle: { color: '#fff', marginBottom: '1rem', fontSize: '0.95rem' },
  shipForm:      {},
  shipFormGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  field:         { marginBottom: '0.5rem' },
  label:         { color: '#aaa', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' },
  input:         { width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#16213e', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' },
  shipFormBtns:  { display: 'flex', gap: '0.8rem' },
  confirmShipBtn:{ padding: '0.6rem 1.5rem', backgroundColor: '#4ecca3', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn:     { padding: '0.6rem 1rem', backgroundColor: 'transparent', border: '1px solid #aaa', color: '#aaa', borderRadius: '8px', cursor: 'pointer' },

  orderDetails:  { padding: '1.2rem 1.5rem', borderTop: '1px solid #0f3460' },
  sectionLabel:  { color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' },
  item:          { display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #0f3460' },
  itemName:      { color: '#fff', fontSize: '0.9rem' },
  itemQty:       { color: '#aaa', fontSize: '0.9rem' },
  itemPrice:     { color: '#4ecca3', fontSize: '0.9rem' },
  address:       { color: '#ccc', fontSize: '0.9rem' },
  timelineItem:  { display: 'flex', gap: '0.8rem', marginBottom: '0.8rem', alignItems: 'flex-start' },
  timelineDot:   { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '0.3rem' },
  timelineStatus:{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize' },
  timelineNote:  { color: '#aaa', fontSize: '0.85rem' },
  timelineTime:  { color: '#555', fontSize: '0.75rem', marginTop: '0.2rem' },
};