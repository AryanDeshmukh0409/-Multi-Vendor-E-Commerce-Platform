import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function RegisterStore() {
  const { token, login, user } = useAuth();
  const navigate               = useNavigate();
  const [error, setError]      = useState('');
  const [loading, setLoading]  = useState(false);

  const [form, setForm] = useState({
    name:        '',
    email:       user?.email || '',
    description: '',
    phone:       '',
    street:      '',
    city:        '',
    zip:         '',
    country:     'Canada',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email)
      return setError('Store name and email are required');

    setLoading(true);
    try {
      const res = await sellerAPI.registerStore({
        name:        form.name,
        email:       form.email,
        description: form.description,
        phone:       form.phone,
        address: {
          street:  form.street,
          city:    form.city,
          zip:     form.zip,
          country: form.country,
        },
      }, token);

      const storeId = res.data.store._id;

      // Update the user context with storeId so JWT reflects it on next login
      // For now just navigate to dashboard — they'll need to re-login to get storeId in token
      alert('Store registered! Please login again to activate your store.');
      navigate('/login');

    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to register store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconBox}>🏪</div>
          <h2 style={styles.title}>Set Up Your Store</h2>
          <p style={styles.sub}>Complete your store profile to start selling</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Store Details</h3>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Store Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    style={styles.input}
                    placeholder="My Awesome Store"
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Store Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    style={styles.input}
                    placeholder="store@email.com"
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                    style={styles.input}
                    placeholder="416-555-0123"
                  />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  style={styles.textarea}
                  placeholder="Tell buyers about your store..."
                />
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Store Address</h3>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Street</label>
                  <input
                    value={form.street}
                    onChange={e => setForm(f => ({...f, street: e.target.value}))}
                    style={styles.input}
                    placeholder="123 Main St"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>City</label>
                  <input
                    value={form.city}
                    onChange={e => setForm(f => ({...f, city: e.target.value}))}
                    style={styles.input}
                    placeholder="Toronto"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>ZIP / Postal Code</label>
                  <input
                    value={form.zip}
                    onChange={e => setForm(f => ({...f, zip: e.target.value}))}
                    style={styles.input}
                    placeholder="M5B 1G7"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Country</label>
                  <select
                    value={form.country}
                    onChange={e => setForm(f => ({...f, country: e.target.value}))}
                    style={styles.input}
                  >
                    <option>Canada</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Australia</option>
                    <option>India</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? '⏳ Creating Store...' : '🏪 Create My Store'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:      { backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#fff', paddingTop: '2rem' },
  container: { maxWidth: '700px', margin: '0 auto', padding: '2rem' },
  card:      { backgroundColor: '#16213e', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  iconBox:   { fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' },
  title:     { color: '#fff', fontSize: '1.8rem', margin: '0 0 0.5rem', textAlign: 'center' },
  sub:       { color: '#aaa', textAlign: 'center', marginBottom: '2rem' },
  error:     { backgroundColor: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },

  section:      { marginBottom: '1.5rem' },
  sectionTitle: { color: '#4ecca3', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' },

  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  field:   { marginBottom: '0.5rem' },
  label:   { color: '#aaa', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' },
  input:   { width: '100%', padding: '0.7rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' },
  textarea:{ width: '100%', padding: '0.7rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' },
  btn:     { width: '100%', padding: '0.9rem', borderRadius: '10px', backgroundColor: '#e94560', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem', fontWeight: 'bold' },
};