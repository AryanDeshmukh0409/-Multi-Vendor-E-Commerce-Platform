import { useState, useEffect } from 'react';
import { catalogAPI, searchAPI } from '../api/services';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts]   = useState([]);
  const [query, setQuery]         = useState('');
  const [category, setCategory]   = useState('');
  const [minPrice, setMinPrice]   = useState('');
  const [maxPrice, setMaxPrice]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [facets, setFacets]       = useState(null);
  const [cart, setCart]           = useState([]);
  const [cartMsg, setCartMsg]     = useState('');

  // Load all products on mount
  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await catalogAPI.listProducts({ status: 'active', limit: 20 });
      setProducts(res.data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (query) {
        const res = await searchAPI.search({ q: query, category, minPrice, maxPrice });
        setProducts(res.data.products || []);
        setFacets(res.data.facets || null);
      } else {
        const res = await catalogAPI.listProducts({ category, status: 'active' });
        setProducts(res.data.products || []);
        setFacets(null);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i._id === product._id);
      if (exists) {
        return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setCartMsg(`✅ ${product.title} added to cart!`);
    setTimeout(() => setCartMsg(''), 2000);
  };

  const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty'];

  return (
    <div style={styles.page}>

      {/* Hero */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Find Your Perfect Product</h1>
        <p style={styles.heroSub}>Shop from thousands of sellers across multiple categories</p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>🔍 Search</button>
        </form>
      </div>

      <div style={styles.content}>

        {/* Filters sidebar */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Filters</h3>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={styles.select}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Price Range</label>
            <input
              type="number"
              placeholder="Min price (cents)"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              style={styles.priceInput}
            />
            <input
              type="number"
              placeholder="Max price (cents)"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              style={styles.priceInput}
            />
          </div>

          <button onClick={handleSearch} style={styles.applyBtn}>Apply Filters</button>
          <button onClick={() => { setQuery(''); setCategory(''); setMinPrice(''); setMaxPrice(''); fetchProducts(); }} style={styles.clearBtn}>
            Clear Filters
          </button>

          {/* Facets from search */}
          {facets?.byCategory?.length > 0 && (
            <div style={styles.facets}>
              <h4 style={styles.facetTitle}>Results by Category</h4>
              {facets.byCategory.map(f => (
                <div key={f._id} style={styles.facetItem}>
                  <span style={styles.facetName}>{f._id}</span>
                  <span style={styles.facetCount}>{f.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products grid */}
        <div style={styles.main}>

          {/* Cart notification */}
          {cartMsg && <div style={styles.cartMsg}>{cartMsg}</div>}

          {/* Cart summary */}
          {cart.length > 0 && (
            <div style={styles.cartBar}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} items in cart —
              Total: ${(cart.reduce((s, i) => s + i.price * i.qty, 0) / 100).toFixed(2)}
              <button style={styles.checkoutBtn} onClick={() => alert('Checkout coming soon!')}>
                Checkout
              </button>
            </div>
          )}

          <div style={styles.resultsHeader}>
            <h2 style={styles.resultsTitle}>
              {query ? `Results for "${query}"` : 'All Products'}
            </h2>
            <span style={styles.resultsCount}>{products.length} products</span>
          </div>

          {loading ? (
            <div style={styles.loading}>Loading products...</div>
          ) : products.length === 0 ? (
            <div style={styles.empty}>No products found. Try a different search.</div>
          ) : (
            <div style={styles.grid}>
              {products.map(p => (
                <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#fff' },
  hero: {
    background:    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding:       '4rem 2rem',
    textAlign:     'center',
  },
  heroTitle: { fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', margin: '0 0 1rem' },
  heroSub:   { color: '#aaa', fontSize: '1.1rem', margin: '0 0 2rem' },
  searchForm: { display: 'flex', maxWidth: '600px', margin: '0 auto', gap: '0.5rem' },
  searchInput: {
    flex: 1, padding: '0.8rem 1.2rem', borderRadius: '30px',
    border: '2px solid #0f3460', backgroundColor: '#16213e',
    color: '#fff', fontSize: '1rem', outline: 'none',
  },
  searchBtn: {
    padding: '0.8rem 1.5rem', borderRadius: '30px',
    backgroundColor: '#e94560', border: 'none',
    color: '#fff', fontSize: '1rem', cursor: 'pointer',
  },
  content:  { display: 'flex', gap: '2rem', padding: '2rem', maxWidth: '1400px', margin: '0 auto' },
  sidebar:  { width: '250px', flexShrink: 0 },
  sidebarTitle: { color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem' },
  filterGroup:  { marginBottom: '1.5rem' },
  filterLabel:  { color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' },
  select: {
    width: '100%', padding: '0.5rem', borderRadius: '8px',
    backgroundColor: '#16213e', border: '1px solid #0f3460',
    color: '#fff', fontSize: '0.9rem',
  },
  priceInput: {
    width: '100%', padding: '0.5rem', borderRadius: '8px',
    backgroundColor: '#16213e', border: '1px solid #0f3460',
    color: '#fff', fontSize: '0.9rem', marginBottom: '0.5rem',
    boxSizing: 'border-box',
  },
  applyBtn: {
    width: '100%', padding: '0.6rem', borderRadius: '8px',
    backgroundColor: '#e94560', border: 'none',
    color: '#fff', cursor: 'pointer', marginBottom: '0.5rem',
  },
  clearBtn: {
    width: '100%', padding: '0.6rem', borderRadius: '8px',
    backgroundColor: 'transparent', border: '1px solid #aaa',
    color: '#aaa', cursor: 'pointer',
  },
  facets:     { marginTop: '1.5rem' },
  facetTitle: { color: '#fff', fontSize: '0.9rem', marginBottom: '0.8rem' },
  facetItem:  { display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' },
  facetName:  { color: '#aaa', fontSize: '0.85rem' },
  facetCount: { color: '#4ecca3', fontSize: '0.85rem' },
  main:       { flex: 1 },
  cartMsg: {
    backgroundColor: '#4ecca3', color: '#000',
    padding: '0.8rem 1.2rem', borderRadius: '8px',
    marginBottom: '1rem', fontWeight: 'bold',
  },
  cartBar: {
    backgroundColor: '#16213e', padding: '1rem 1.5rem',
    borderRadius: '8px', marginBottom: '1rem',
    display: 'flex', alignItems: 'center', gap: '1rem',
    color: '#fff',
  },
  checkoutBtn: {
    marginLeft: 'auto', padding: '0.4rem 1rem',
    backgroundColor: '#e94560', border: 'none',
    color: '#fff', borderRadius: '8px', cursor: 'pointer',
  },
  resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  resultsTitle:  { color: '#fff', fontSize: '1.3rem', margin: 0 },
  resultsCount:  { color: '#aaa', fontSize: '0.9rem' },
  loading: { color: '#aaa', textAlign: 'center', padding: '3rem' },
  empty:   { color: '#aaa', textAlign: 'center', padding: '3rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
};