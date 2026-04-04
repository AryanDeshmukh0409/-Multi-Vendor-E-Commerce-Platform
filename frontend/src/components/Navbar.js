import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>🛒 MultiVendor</Link>

      <div style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>

        {user?.role === 'buyer' && (
          <>
            <Link to="/orders" style={styles.link}>My Orders</Link>
            <Link to="/cart" style={styles.link}>Cart</Link>
          </>
        )}

        {user?.role === 'seller' && (
          <>
            <Link to="/seller/dashboard" style={styles.link}>Dashboard</Link>
            <Link to="/seller/products" style={styles.link}>Products</Link>
            <Link to="/seller/orders" style={styles.link}>Orders</Link>
          </>
        )}

        {user?.role === 'admin' && (
          <Link to="/admin/analytics" style={styles.link}>Analytics</Link>
        )}

        {user ? (
          <div style={styles.userSection}>
            <span style={styles.userEmail}>{user.email}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.registerBtn}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display:         'flex',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         '0 2rem',
    height:          '64px',
    backgroundColor: '#1a1a2e',
    color:           '#fff',
    boxShadow:       '0 2px 10px rgba(0,0,0,0.3)',
    position:        'sticky',
    top:             0,
    zIndex:          100,
  },
  brand: {
    fontSize:       '1.4rem',
    fontWeight:     'bold',
    color:          '#e94560',
    textDecoration: 'none',
  },
  links: {
    display:    'flex',
    alignItems: 'center',
    gap:        '1.5rem',
  },
  link: {
    color:          '#ccc',
    textDecoration: 'none',
    fontSize:       '0.95rem',
    transition:     'color 0.2s',
  },
  registerBtn: {
    backgroundColor: '#e94560',
    color:           '#fff',
    padding:         '0.4rem 1rem',
    borderRadius:    '20px',
    textDecoration:  'none',
    fontSize:        '0.9rem',
  },
  userSection: {
    display:    'flex',
    alignItems: 'center',
    gap:        '1rem',
  },
  userEmail: {
    color:    '#aaa',
    fontSize: '0.85rem',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border:          '1px solid #e94560',
    color:           '#e94560',
    padding:         '0.3rem 0.8rem',
    borderRadius:    '20px',
    cursor:          'pointer',
    fontSize:        '0.85rem',
  },
};