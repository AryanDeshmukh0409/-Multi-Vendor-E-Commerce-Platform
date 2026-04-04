import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/services';

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('buyer');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.register({ email, password, role });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.sub}>Join our marketplace</p>

        {error   && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} placeholder="you@example.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} placeholder="••••••••" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>I want to</label>
            <div style={styles.roleGroup}>
              {['buyer', 'seller'].map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  style={{ ...styles.roleBtn, ...(role === r ? styles.roleBtnActive : {}) }}>
                  {r === 'buyer' ? '🛒 Buy Products' : '🏪 Sell Products'}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { backgroundColor: '#0a0a1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#16213e', padding: '2.5rem', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  title: { color: '#fff', fontSize: '1.8rem', margin: '0 0 0.5rem', textAlign: 'center' },
  sub:   { color: '#aaa', textAlign: 'center', marginBottom: '2rem' },
  error:   { backgroundColor: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },
  success: { backgroundColor: '#4ecca320', border: '1px solid #4ecca3', color: '#4ecca3', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },
  field: { marginBottom: '1.2rem' },
  label: { color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' },
  roleGroup: { display: 'flex', gap: '0.8rem' },
  roleBtn: { flex: 1, padding: '0.7rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '2px solid #1a4a8a', color: '#aaa', cursor: 'pointer', fontSize: '0.9rem' },
  roleBtnActive: { borderColor: '#e94560', color: '#fff', backgroundColor: '#e9456020' },
  btn:   { width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#e94560', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  footer: { color: '#aaa', textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' },
  link:   { color: '#e94560', textDecoration: 'none' },
};