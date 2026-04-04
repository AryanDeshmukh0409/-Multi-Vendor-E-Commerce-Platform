import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, shippingAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const STATUS_COLORS = {
  pending:   '#aaa',
  paid:      '#4ecca3',
  processing:'#f0a500',
  shipped:   '#3b82f6',
  delivered: '#22c55e',
  cancelled: '#e94560',
};

const STATUS_ICONS = {
  pending:    '🕐',
  paid:       '💳',
  processing: '📦',
  shipped:    '🚚',
  delivered:  '✅',
  cancelled:  '❌',
};

export default function Orders() {
  const { token }               = useAuth();
  const navigate                = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [shipments, setShipments] = useState({});

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await orderAPI.listOrders(token);
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipment = async (orderId) => {
    if (shipments[orderId]) return;
    try {
      const res = await shippingAPI.getShipmentByOrder(orderId, token);
      setShipments(prev => ({ ...prev, [orderId]: res.data.shipments || [] }));
    } catch {
      setShipments(prev => ({ ...prev, [orderId]: [] }));
    }
  };

  const handleSelectOrder = (order) => {
    setSelected(order._id === selected ? null : order._id);
    fetchShipment(order._id);
  };

  if (loading) return <div style={styles.loading}>Loading orders...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>📦 My Orders</h1>

        {orders.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📭</div>
            <h2 style={styles.emptyText}>No orders yet</h2>
            <button onClick={() => navigate('/')} style={styles.shopBtn}>Start Shopping</button>
          </div>
        ) : (
          <div style={styles.ordersList}>
            {orders.map(order => (
              <div key={order._id} style={styles.orderCard}>

                {/* Order header */}
                <div style={styles.orderHeader} onClick={() => handleSelectOrder(order)}>
                  <div style={styles.orderMeta}>
                    <span style={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</span>
                    <span style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.orderRight}>
                    <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status], border: `1px solid ${STATUS_COLORS[order.status]}` }}>
                      {STATUS_ICONS[order.status]} {order.status.toUpperCase()}
                    </span>
                    <span style={styles.orderTotal}>${(order.totalAmount / 100).toFixed(2)}</span>
                    <span style={styles.expandIcon}>{selected === order._id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {selected === order._id && (
                  <div style={styles.orderDetails}>

                    {/* Progress bar */}
                    {order.status !== 'cancelled' && (
                      <div style={styles.progressSection}>
                        <h4 style={styles.sectionLabel}>Order Progress</h4>
                        <div style={styles.progressBar}>
                          {STATUS_STEPS.map((step, i) => {
                            const currentIdx = STATUS_STEPS.indexOf(order.status);
                            const isDone     = i <= currentIdx;
                            return (
                              <div key={step} style={styles.progressStep}>
                                <div style={{
                                  ...styles.progressDot,
                                  backgroundColor: isDone ? STATUS_COLORS[step] : '#333',
                                  border: `2px solid ${isDone ? STATUS_COLORS[step] : '#555'}`,
                                }}>
                                  {isDone ? '✓' : ''}
                                </div>
                                {i < STATUS_STEPS.length - 1 && (
                                  <div style={{
                                    ...styles.progressLine,
                                    backgroundColor: i < currentIdx ? '#4ecca3' : '#333',
                                  }} />
                                )}
                                <span style={{ ...styles.progressLabel, color: isDone ? '#fff' : '#555' }}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div style={styles.itemsSection}>
                      <h4 style={styles.sectionLabel}>Items</h4>
                      {order.items.map((item, i) => (
                        <div key={i} style={styles.item}>
                          <span style={styles.itemName}>{item.title}</span>
                          <span style={styles.itemQty}>x{item.qty}</span>
                          <span style={styles.itemPrice}>${(item.price * item.qty / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Shipping address */}
                    <div style={styles.addressSection}>
                      <h4 style={styles.sectionLabel}>📍 Shipping To</h4>
                      <p style={styles.address}>
                        {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.zip}, {order.shippingAddress.country}
                      </p>
                    </div>

                    {/* Shipment tracking */}
                    {shipments[order._id]?.length > 0 && (
                      <div style={styles.trackingSection}>
                        <h4 style={styles.sectionLabel}>🚚 Tracking</h4>
                        {shipments[order._id].map(s => (
                          <div key={s._id} style={styles.trackingCard}>
                            <div style={styles.trackingHeader}>
                              <span style={styles.carrier}>{s.carrier}</span>
                              <span style={styles.trackingNum}>#{s.trackingNumber}</span>
                            </div>
                            <div style={styles.trackingTimeline}>
                              {s.timeline.map((t, i) => (
                                <div key={i} style={styles.timelineItem}>
                                  <div style={styles.timelineDot} />
                                  <div>
                                    <span style={styles.timelineStatus}>{t.status}</span>
                                    {t.location && <span style={styles.timelineLocation}> — {t.location}</span>}
                                    <div style={styles.timelineTime}>
                                      {new Date(t.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timeline */}
                    <div style={styles.timelineSection}>
                      <h4 style={styles.sectionLabel}>Order Timeline</h4>
                      {order.timeline.map((t, i) => (
                        <div key={i} style={styles.timelineItem}>
                          <div style={{ ...styles.timelineDot, backgroundColor: STATUS_COLORS[t.status] || '#aaa' }} />
                          <div>
                            <span style={styles.timelineStatus}>{t.status}</span>
                            {t.note && <span style={styles.timelineLocation}> — {t.note}</span>}
                            <div style={styles.timelineTime}>
                              {new Date(t.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

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
  container: { maxWidth: '900px', margin: '0 auto', padding: '2rem' },
  loading:   { color: '#aaa', textAlign: 'center', padding: '4rem', backgroundColor: '#0a0a1a' },
  pageTitle: { color: '#fff', fontSize: '1.8rem', marginBottom: '2rem' },

  empty:    { textAlign: 'center', padding: '4rem' },
  emptyIcon:{ fontSize: '4rem', marginBottom: '1rem' },
  emptyText:{ color: '#aaa', marginBottom: '1.5rem' },
  shopBtn:  { padding: '0.8rem 2rem', backgroundColor: '#e94560', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem' },

  ordersList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  orderCard:  { backgroundColor: '#16213e', borderRadius: '12px', overflow: 'hidden' },
  orderHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', cursor: 'pointer' },
  orderMeta:  { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  orderId:    { color: '#fff', fontWeight: 'bold', fontSize: '1rem' },
  orderDate:  { color: '#aaa', fontSize: '0.8rem' },
  orderRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  statusBadge:{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' },
  orderTotal: { color: '#4ecca3', fontWeight: 'bold', fontSize: '1.1rem' },
  expandIcon: { color: '#aaa', fontSize: '0.8rem' },

  orderDetails: { padding: '1.5rem', borderTop: '1px solid #0f3460' },
  sectionLabel: { color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' },

  progressSection: { marginBottom: '1.5rem' },
  progressBar:     { display: 'flex', alignItems: 'flex-start' },
  progressStep:    { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' },
  progressDot:     { width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', zIndex: 1 },
  progressLine:    { height: '2px', width: '60px', margin: '11px 0' },
  progressLabel:   { fontSize: '0.7rem', marginTop: '0.4rem', textTransform: 'capitalize' },

  itemsSection: { marginBottom: '1.5rem' },
  item:         { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #0f3460' },
  itemName:     { color: '#fff', fontSize: '0.9rem' },
  itemQty:      { color: '#aaa', fontSize: '0.9rem' },
  itemPrice:    { color: '#4ecca3', fontSize: '0.9rem' },

  addressSection: { marginBottom: '1.5rem' },
  address:        { color: '#ccc', fontSize: '0.9rem' },

  trackingSection: { marginBottom: '1.5rem' },
  trackingCard:    { backgroundColor: '#0f3460', borderRadius: '8px', padding: '1rem' },
  trackingHeader:  { display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' },
  carrier:         { color: '#fff', fontWeight: 'bold' },
  trackingNum:     { color: '#4ecca3', fontSize: '0.85rem' },

  timelineSection: { marginBottom: '0.5rem' },
  timelineItem:    { display: 'flex', gap: '0.8rem', marginBottom: '0.8rem', alignItems: 'flex-start' },
  timelineDot:     { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ecca3', flexShrink: 0, marginTop: '0.3rem' },
  timelineStatus:  { color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize' },
  timelineLocation:{ color: '#aaa', fontSize: '0.85rem' },
  timelineTime:    { color: '#555', fontSize: '0.75rem', marginTop: '0.2rem' },
};