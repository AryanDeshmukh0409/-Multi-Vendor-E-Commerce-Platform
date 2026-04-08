import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogAPI, inventoryAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function SellerProducts() {
  const { user, token }         = useAuth();
  const navigate                = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  
// 1. Add these state variables at the top of the component (after existing useState calls):
const [stockProductId, setStockProductId] = useState(null);
const [stockQty, setStockQty]             = useState('');
const [stockLoading, setStockLoading]     = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', category: 'electronics',
    price: '', images: '', color: '', weight: '',
  });

  useEffect(() => {
    if (!token || user?.role !== 'seller') { navigate('/login'); return; }
    fetchProducts();
  }, [token]);

  const fetchProducts = async () => {
    try {
      const res = await catalogAPI.listProducts({ sellerId: user?.userId, status: 'active' });
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        title:       form.title,
        description: form.description,
        category:    form.category,
        price:       Math.round(parseFloat(form.price) * 100), // convert to cents
        images:      form.images ? [form.images] : [],
        attributes:  {
          ...(form.color  && { color: form.color }),
          ...(form.weight && { weight: form.weight }),
        },
      };

      if (editProduct) {
        await catalogAPI.updateProduct(editProduct._id, data, token);
        setSuccess('Product updated successfully!');
      } else {
        await catalogAPI.createProduct(data, token);
        setSuccess('Product created successfully!');
      }

      setShowForm(false);
      setEditProduct(null);
      resetForm();
      fetchProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setForm({
      title:       product.title,
      description: product.description,
      category:    product.category,
      price:       (product.price / 100).toString(),
      images:      product.images?.[0] || '',
      color:       product.attributes?.color || '',
      weight:      product.attributes?.weight || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await catalogAPI.deleteProduct(id, token);
      setSuccess('Product deleted!');
      fetchProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete product');
    }
  };
    

const handleSetStock = async (productId) => {
  if (!stockQty || isNaN(stockQty) || Number(stockQty) < 0) {
    setError('Please enter a valid quantity');
    return;
  }
  setStockLoading(true);
  try {
    await inventoryAPI.setStock(productId, { quantity: Number(stockQty) }, token);
    setSuccess(`✅ Stock updated to ${stockQty} units!`);
    setStockProductId(null);
    setStockQty('');
    setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
    setError(err.response?.data?.error?.message || 'Failed to update stock');
  } finally {
    setStockLoading(false);
  }
};

  const resetForm = () => setForm({ title: '', description: '', category: 'electronics', price: '', images: '', color: '', weight: '' });

  const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'other'];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <button onClick={() => navigate('/seller/dashboard')} style={styles.backBtn}>← Dashboard</button>
            <h1 style={styles.title}>📋 My Products</h1>
          </div>
          <button onClick={() => { resetForm(); setEditProduct(null); setShowForm(!showForm); }} style={styles.addBtn}>
            {showForm ? '✕ Cancel' : '+ Add Product'}
          </button>
        </div>

        {success && <div style={styles.success}>{success}</div>}
        {error   && <div style={styles.error}>{error}</div>}

        {/* Add/Edit form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} style={styles.input} placeholder="Product title" required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={styles.input}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Price (in $) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} style={styles.input} placeholder="29.99" required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Image URL</label>
                  <input value={form.images} onChange={e => setForm(f => ({...f, images: e.target.value}))} style={styles.input} placeholder="https://..." />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Color</label>
                  <input value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))} style={styles.input} placeholder="black" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Weight</label>
                  <input value={form.weight} onChange={e => setForm(f => ({...f, weight: e.target.value}))} style={styles.input} placeholder="1kg" />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={styles.textarea} placeholder="Product description..." required />
              </div>
              <button type="submit" style={styles.submitBtn}>
                {editProduct ? '💾 Save Changes' : '✅ Create Product'}
              </button>
            </form>
          </div>
        )}

        {/* Products list */}
        {loading ? (
          <div style={styles.loading}>Loading products...</div>
        ) : products.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📦</div>
            <p style={styles.emptyText}>No products yet. Add your first product!</p>
          </div>
        ) : (
          <div style={styles.productsList}>
            {products.map(product => (
              <div key={product._id} style={styles.productRow}>
                <div style={styles.productImg}>
                  {product.images?.[0]
                    ? <img src={product.images[0]} alt={product.title} style={styles.img} />
                    : <div style={styles.noImg}>📦</div>
                  }
                </div>
                <div style={styles.productInfo}>
                  <h3 style={styles.productTitle}>{product.title}</h3>
                  <p style={styles.productCat}>{product.category}</p>
                  <p style={styles.productDesc}>{product.description?.slice(0, 80)}...</p>
                </div>
                <div style={styles.productMeta}>
                  <span style={styles.productPrice}>${(product.price / 100).toFixed(2)}</span>
                  <span style={styles.productRating}>⭐ {product.avgRating?.toFixed(1) || '0.0'}</span>
                  <span style={{ ...styles.productStatus, color: product.status === 'active' ? '#4ecca3' : '#e94560' }}>
                    {product.status}
                  </span>
                </div>

                <div style={styles.productActions}>
  <button onClick={() => handleEdit(product)} style={styles.editBtn}>✏️ Edit</button>
  <button
    onClick={() => {
      setStockProductId(stockProductId === product._id ? null : product._id);
      setStockQty('');
    }}
    style={styles.stockBtn}
  >
    📦 Stock
  </button>
  <button onClick={() => handleDelete(product._id)} style={styles.deleteBtn}>🗑️ Delete</button>
</div>

{stockProductId === product._id && (
  <div style={styles.stockForm}>
    <span style={styles.stockLabel}>Set Stock Quantity:</span>
    <input
      type="number"
      min="0"
      value={stockQty}
      onChange={e => setStockQty(e.target.value)}
      style={styles.stockInput}
      placeholder="e.g. 100"
      autoFocus
    />
    <button
      onClick={() => handleSetStock(product._id)}
      style={styles.stockConfirmBtn}
      disabled={stockLoading}
    >
      {stockLoading ? '...' : '✅ Save'}
    </button>
    <button
      onClick={() => setStockProductId(null)}
      style={styles.stockCancelBtn}
    >
      Cancel
    </button>
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
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  loading:   { color: '#aaa', textAlign: 'center', padding: '4rem' },

  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem', padding: 0 },
  title:   { color: '#fff', fontSize: '1.8rem', margin: 0 },
  addBtn:  { padding: '0.7rem 1.5rem', backgroundColor: '#e94560', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer' },

  success: { backgroundColor: '#4ecca320', border: '1px solid #4ecca3', color: '#4ecca3', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },
  error:   { backgroundColor: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' },

  formCard:  { backgroundColor: '#16213e', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
  formTitle: { color: '#fff', marginBottom: '1rem' },
  form:      {},
  formGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  field:     { marginBottom: '0.5rem' },
  label:     { color: '#aaa', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' },
  input:     { width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' },
  textarea:  { width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' },
  submitBtn: { padding: '0.8rem 2rem', backgroundColor: '#4ecca3', border: 'none', color: '#000', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' },

  empty:     { textAlign: 'center', padding: '3rem', backgroundColor: '#16213e', borderRadius: '12px' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyText: { color: '#aaa' },

  productsList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  productRow:   { backgroundColor: '#16213e', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' },
  productImg:   { width: '80px', height: '80px', backgroundColor: '#0f3460', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  img:          { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' },
  noImg:        { fontSize: '2rem' },
  productInfo:  { flex: 1, minWidth: '200px' },
  productTitle: { color: '#fff', margin: '0 0 0.3rem', fontSize: '1rem' },
  productCat:   { color: '#e94560', fontSize: '0.75rem', margin: '0 0 0.3rem' },
  productDesc:  { color: '#aaa', fontSize: '0.8rem', margin: 0 },
  productMeta:  { display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' },
  productPrice: { color: '#4ecca3', fontWeight: 'bold', fontSize: '1.1rem' },
  productRating:{ color: '#ffd700', fontSize: '0.85rem' },
  productStatus:{ fontSize: '0.8rem' },
  productActions:{ display: 'flex', gap: '0.5rem', flexDirection: 'column' },
  editBtn:      { padding: '0.4rem 0.8rem', backgroundColor: '#0f3460', border: '1px solid #1a4a8a', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  deleteBtn:    { padding: '0.4rem 0.8rem', backgroundColor: 'transparent', border: '1px solid #e94560', color: '#e94560', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },


stockBtn: {
  padding: '0.4rem 0.8rem', backgroundColor: 'transparent',
  border: '1px solid #4ecca3', color: '#4ecca3',
  borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
},
stockForm: {
  width: '100%', display: 'flex', alignItems: 'center',
  gap: '0.8rem', padding: '0.8rem 1rem',
  backgroundColor: '#0f3460', borderRadius: '8px',
  marginTop: '0.5rem', flexWrap: 'wrap',
},
stockLabel:      { color: '#aaa', fontSize: '0.85rem' },
stockInput: {
  padding: '0.5rem', borderRadius: '6px', width: '100px',
  backgroundColor: '#16213e', border: '1px solid #1a4a8a',
  color: '#fff', fontSize: '0.9rem',
},
stockConfirmBtn: {
  padding: '0.5rem 1rem', backgroundColor: '#4ecca3',
  border: 'none', color: '#000', borderRadius: '6px',
  cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem',
},
stockCancelBtn: {
  padding: '0.5rem 0.8rem', backgroundColor: 'transparent',
  border: '1px solid #aaa', color: '#aaa',
  borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
},
};