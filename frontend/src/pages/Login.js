import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      login(
        { email, role: res.data.role, userId: res.data.userId },
        res.data.access_token
      );
      if (res.data.role === 'seller') navigate('/seller/dashboard');
      else if (res.data.role === 'admin') navigate('/admin/analytics');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.sub}>Login to your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} placeholder="you@example.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} placeholder="••••••••" required />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
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
  error: { backgroundColor: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },
  field: { marginBottom: '1.2rem' },
  label: { color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' },
  btn:   { width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#e94560', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  footer: { color: '#aaa', textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' },
  link:   { color: '#e94560', textDecoration: 'none' },
};