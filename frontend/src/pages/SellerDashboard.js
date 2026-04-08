import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerAPI, analyticsAPI, orderAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function SellerDashboard() {
  const { user, token } = useAuth();
  const navigate        = useNavigate();
  const [store, setStore]   = useState(null);
  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'seller') { navigate('/login'); return; }
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
  try {
    const [storeRes, statsRes, ordersRes] = await Promise.allSettled([
      sellerAPI.getMyStore(token),
      analyticsAPI.getSellerStats(token),
      orderAPI.listOrders(token),
    ]);

    if (storeRes.status === 'fulfilled') {
      setStore(storeRes.value.data.store);
    } else {
      navigate('/seller/register-store');
      return;
    }

    if (statsRes.status  === 'fulfilled') setStats(statsRes.value.data);
    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.orders || []);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  const recentOrders = orders.slice(0, 5);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏪 Seller Dashboard</h1>
            <p style={styles.storeName}>{store?.name || 'My Store'}</p>
          </div>
          <div style={styles.headerBtns}>
            <button onClick={() => navigate('/seller/products')} style={styles.primaryBtn}>
              + Add Product
            </button>
            <button onClick={() => navigate('/seller/orders')} style={styles.secondaryBtn}>
              View Orders
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statInfo}>
              <p style={styles.statLabel}>Total Revenue</p>
              <h2 style={styles.statValue}>
                ${((stats?.summary?.totalRevenue || store?.totalRevenue || 0) / 100).toFixed(2)}
              </h2>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📦</div>
            <div style={styles.statInfo}>
              <p style={styles.statLabel}>Total Orders</p>
              <h2 style={styles.statValue}>
                {stats?.summary?.totalOrders || store?.totalOrders || 0}
              </h2>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💳</div>
            <div style={styles.statInfo}>
              <p style={styles.statLabel}>Avg Order Value</p>
              <h2 style={styles.statValue}>
                ${((stats?.summary?.avgOrderValue || 0) / 100).toFixed(2)}
              </h2>
            </div>
          </div>

        </div>

        {/* Quick actions */}
        <div style={styles.actionsGrid}>
          <div style={styles.actionCard} onClick={() => navigate('/seller/products')}>
            <div style={styles.actionIcon}>📋</div>
            <h3 style={styles.actionTitle}>Manage Products</h3>
            <p style={styles.actionDesc}>Add, edit or remove your product listings</p>
          </div>
          <div style={styles.actionCard} onClick={() => navigate('/seller/orders')}>
            <div style={styles.actionIcon}>🚚</div>
            <h3 style={styles.actionTitle}>Manage Orders</h3>
            <p style={styles.actionDesc}>View and ship customer orders</p>
          </div>
          <div style={styles.actionCard} onClick={() => navigate('/')}>
            <div style={styles.actionIcon}>🛍️</div>
            <h3 style={styles.actionTitle}>View Storefront</h3>
            <p style={styles.actionDesc}>See how buyers view your store</p>
          </div>
        </div>

        {/* Recent orders */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <div style={styles.empty}>No orders yet</div>
          ) : (
            <div style={styles.ordersTable}>
              <div style={styles.tableHeader}>
                <span>Order ID</span>
                <span>Date</span>
                <span>Items</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {recentOrders.map(order => (
                <div key={order._id} style={styles.tableRow}>
                  <span style={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</span>
                  <span style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span style={styles.orderItems}>{order.items.length} item(s)</span>
                  <span style={styles.orderAmount}>${(order.totalAmount / 100).toFixed(2)}</span>
                  <span style={{
                    ...styles.statusBadge,
                    color: order.status === 'delivered' ? '#4ecca3' :
                           order.status === 'shipped'   ? '#3b82f6' :
                           order.status === 'paid'      ? '#f0a500' : '#aaa'
                  }}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Store info */}
        {store && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Store Info</h2>
            <div style={styles.storeInfo}>
              <div style={styles.storeInfoItem}>
                <span style={styles.storeInfoLabel}>Store Name</span>
                <span style={styles.storeInfoValue}>{store.name}</span>
              </div>
              <div style={styles.storeInfoItem}>
                <span style={styles.storeInfoLabel}>Email</span>
                <span style={styles.storeInfoValue}>{store.email}</span>
              </div>
              <div style={styles.storeInfoItem}>
                <span style={styles.storeInfoLabel}>Phone</span>
                <span style={styles.storeInfoValue}>{store.phone || 'N/A'}</span>
              </div>
              <div style={styles.storeInfoItem}>
                <span style={styles.storeInfoLabel}>Description</span>
                <span style={styles.storeInfoValue}>{store.description || 'N/A'}</span>
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
  loading:   { color: '#aaa', textAlign: 'center', padding: '4rem', backgroundColor: '#0a0a1a' },

  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title:       { color: '#fff', fontSize: '1.8rem', margin: '0 0 0.3rem' },
  storeName:   { color: '#4ecca3', margin: 0 },
  headerBtns:  { display: 'flex', gap: '1rem' },
  primaryBtn:  { padding: '0.7rem 1.5rem', backgroundColor: '#e94560', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem' },
  secondaryBtn:{ padding: '0.7rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #4ecca3', color: '#4ecca3', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:  { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' },
  statIcon:  { fontSize: '2rem' },
  statInfo:  {},
  statLabel: { color: '#aaa', fontSize: '0.8rem', margin: '0 0 0.3rem' },
  statValue: { color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 },

  actionsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  actionCard:   { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'center' },
  actionIcon:   { fontSize: '2.5rem', marginBottom: '0.8rem' },
  actionTitle:  { color: '#fff', margin: '0 0 0.5rem' },
  actionDesc:   { color: '#aaa', fontSize: '0.85rem', margin: 0 },

  section:      { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
  sectionTitle: { color: '#fff', marginBottom: '1rem' },
  empty:        { color: '#aaa', textAlign: 'center', padding: '1rem' },

  ordersTable: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', color: '#aaa', fontSize: '0.8rem', padding: '0.5rem 0', borderBottom: '1px solid #0f3460' },
  tableRow:    { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '0.8rem 0', borderBottom: '1px solid #0f346050', alignItems: 'center' },
  orderId:     { color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' },
  orderDate:   { color: '#aaa', fontSize: '0.85rem' },
  orderItems:  { color: '#aaa', fontSize: '0.85rem' },
  orderAmount: { color: '#4ecca3', fontSize: '0.9rem', fontWeight: 'bold' },
  statusBadge: { fontSize: '0.8rem', textTransform: 'capitalize' },

  storeInfo:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  storeInfoItem:  { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  storeInfoLabel: { color: '#aaa', fontSize: '0.8rem' },
  storeInfoValue: { color: '#fff', fontSize: '0.95rem' },
};