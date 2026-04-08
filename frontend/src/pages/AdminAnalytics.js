import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, reviewAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function AdminAnalytics() {
  const { user, token }           = useAuth();
  const navigate                  = useNavigate();
  const [revenue, setRevenue]     = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers]   = useState([]);
  const [pending, setPending]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'admin') { navigate('/login'); return; }
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    try {
      const [revRes, prodRes, sellRes, pendRes] = await Promise.allSettled([
        analyticsAPI.getRevenue(token),
        analyticsAPI.getTopProducts(token),
        analyticsAPI.getTopSellers(token),
        reviewAPI.getPending(token),
      ]);
      if (revRes.status   === 'fulfilled') setRevenue(revRes.value.data.data || []);
      if (prodRes.status  === 'fulfilled') setTopProducts(prodRes.value.data.data || []);
      if (sellRes.status  === 'fulfilled') setTopSellers(sellRes.value.data.data || []);
      if (pendRes.status  === 'fulfilled') setPending(pendRes.value.data.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await reviewAPI.approveReview(id, token);
      setPending(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Failed to approve review:', err);
    }
  };

  const handleFlag = async (id) => {
    try {
      await reviewAPI.flagReview(id, token);
      setPending(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Failed to flag review:', err);
    }
  };

  const totalGMV    = revenue.reduce((s, d) => s + (d.gmv || 0), 0);
  const totalOrders = revenue.reduce((s, d) => s + (d.orderCount || 0), 0);

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <h1 style={styles.title}>📊 Admin Analytics</h1>

        {/* Summary cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div>
              <p style={styles.statLabel}>Total GMV</p>
              <h2 style={styles.statValue}>${(totalGMV / 100).toFixed(2)}</h2>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📦</div>
            <div>
              <p style={styles.statLabel}>Total Orders</p>
              <h2 style={styles.statValue}>{totalOrders}</h2>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🏪</div>
            <div>
              <p style={styles.statLabel}>Active Sellers</p>
              <h2 style={styles.statValue}>{topSellers.length}</h2>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⭐</div>
            <div>
              <p style={styles.statLabel}>Pending Reviews</p>
              <h2 style={styles.statValue}>{pending.length}</h2>
            </div>
          </div>
        </div>

        <div style={styles.grid}>

          {/* Revenue by day */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📈 Daily Revenue</h2>
            {revenue.length === 0 ? (
              <div style={styles.empty}>No revenue data yet</div>
            ) : (
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <span>Date</span>
                  <span>Orders</span>
                  <span>GMV</span>
                  <span>Avg Order</span>
                </div>
                {revenue.slice(0, 10).map((d, i) => (
                  <div key={i} style={styles.tableRow}>
                    <span style={styles.cell}>{d._id}</span>
                    <span style={styles.cell}>{d.orderCount}</span>
                    <span style={{ ...styles.cell, color: '#4ecca3' }}>${(d.gmv / 100).toFixed(2)}</span>
                    <span style={styles.cell}>${(d.avgOrder / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top products */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏆 Top Products</h2>
            {topProducts.length === 0 ? (
              <div style={styles.empty}>No product data yet</div>
            ) : (
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <span>Product ID</span>
                  <span>Units Sold</span>
                  <span>Revenue</span>
                </div>
                {topProducts.slice(0, 8).map((p, i) => (
                  <div key={i} style={styles.tableRow}>
                    <span style={styles.cell}>#{p.productId?.slice(-6).toUpperCase()}</span>
                    <span style={styles.cell}>{p.unitsSold}</span>
                    <span style={{ ...styles.cell, color: '#4ecca3' }}>${(p.revenue / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top sellers */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🥇 Top Sellers</h2>
            {topSellers.length === 0 ? (
              <div style={styles.empty}>No seller data yet</div>
            ) : (
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <span>Seller ID</span>
                  <span>Orders</span>
                </div>
                {topSellers.slice(0, 8).map((s, i) => (
                  <div key={i} style={styles.tableRow}>
                    <span style={styles.cell}>#{s.sellerId?.slice(-6).toUpperCase()}</span>
                    <span style={styles.cell}>{s.orderCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review moderation */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>⭐ Review Moderation</h2>
            {pending.length === 0 ? (
              <div style={styles.empty}>No pending reviews — all clear!</div>
            ) : (
              <div style={styles.reviewsList}>
                {pending.map(r => (
                  <div key={r._id} style={styles.reviewCard}>
                    <div style={styles.reviewHeader}>
                      <div style={styles.reviewStars}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ color: s <= r.rating ? '#ffd700' : '#555' }}>★</span>
                        ))}
                      </div>
                      <span style={styles.reviewDate}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={styles.reviewBody}>{r.body}</p>
                    <div style={styles.reviewActions}>
                      <button onClick={() => handleApprove(r._id)} style={styles.approveBtn}>
                        ✅ Approve
                      </button>
                      <button onClick={() => handleFlag(r._id)} style={styles.flagBtn}>
                        🚩 Flag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:      { backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#fff' },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  loading:   { color: '#aaa', textAlign: 'center', padding: '4rem', backgroundColor: '#0a0a1a' },
  title:     { color: '#fff', fontSize: '1.8rem', marginBottom: '2rem' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:  { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' },
  statIcon:  { fontSize: '2rem' },
  statLabel: { color: '#aaa', fontSize: '0.8rem', margin: '0 0 0.3rem' },
  statValue: { color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 },

  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' },
  section: { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.5rem' },
  sectionTitle: { color: '#fff', marginBottom: '1rem', fontSize: '1.1rem' },
  empty:   { color: '#aaa', textAlign: 'center', padding: '1.5rem' },

  table:       { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  tableHeader: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', color: '#aaa', fontSize: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #0f3460' },
  tableRow:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', padding: '0.6rem 0', borderBottom: '1px solid #0f346030' },
  cell:        { color: '#ccc', fontSize: '0.85rem' },

  reviewsList:   { display: 'flex', flexDirection: 'column', gap: '1rem' },
  reviewCard:    { backgroundColor: '#0f3460', borderRadius: '8px', padding: '1rem' },
  reviewHeader:  { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' },
  reviewStars:   { fontSize: '1rem' },
  reviewDate:    { color: '#aaa', fontSize: '0.8rem' },
  reviewBody:    { color: '#ccc', fontSize: '0.85rem', marginBottom: '0.8rem', lineHeight: 1.5 },
  reviewActions: { display: 'flex', gap: '0.8rem' },
  approveBtn:    { padding: '0.4rem 1rem', backgroundColor: '#4ecca3', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' },
  flagBtn:       { padding: '0.4rem 1rem', backgroundColor: 'transparent', border: '1px solid #e94560', color: '#e94560', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
};